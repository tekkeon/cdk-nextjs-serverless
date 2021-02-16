import * as lambda from '@aws-cdk/aws-lambda';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as logs from '@aws-cdk/aws-logs';
import * as origins from '@aws-cdk/aws-cloudfront-origins'
import * as s3 from '@aws-cdk/aws-s3';
import * as s3deploy from '@aws-cdk/aws-s3-deployment'
import { Construct, Duration } from '@aws-cdk/core';
import path from 'path';
import { buildNextJsProject, removeOutDir } from './utils';

/**
 * @summary The properties for the NextJSServerless Construct
 */
export interface NextJSServerlessProps {
  /**
   * Path to NextJS application directory.
   *
   * @default - None
   */
  readonly nextJSDir: string
  /**
   * (Optional) Path to node_modules directory to use for NextJS build. If not provided, nearest node_modules directory to nextJSDir will be used.
   *
   * @default - None
   */
  readonly nodeModulesDir?: string
  /**
   * Existing instance of Lambda Function object. If this is set then the lambdaFunctionProps is ignored.
   *
   * @default - None
   */
  readonly existingLambdaObj?: lambda.Function,
  /**
   * User provided props to override the default props for the Lambda function.
   *
   * @default - Default props are used
   */
  readonly lambdaFunctionProps?: lambda.FunctionProps
  /**
   * Optional user provided props to override the default props for the API Gateway.
   *
   * @default - Default props are used
   */
  readonly cloudFrontDistributionProps?: cloudfront.DistributionProps | any,
  /**
   * User provided props to override the default props for the CloudWatchLogs LogGroup.
   *
   * @default - Default props are used
   */
  readonly logGroupProps?: logs.LogGroupProps
}

export class NextJSServerless extends Construct {
  // public readonly cloudFrontWebDistribution: cloudfront.Distribution;
  // public readonly edgeLambdaFunctionVersion?: lambda.Version;
  // public readonly cloudFrontLoggingBucket?: s3.Bucket;
  // public readonly lambdaFunction: lambda.Function;

  /**
   * @summary Constructs a new instance of the CloudFrontToApiGatewayToLambda class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {NextJSServerlessProps} props - user provided props for the construct
   * @since 0.8.0
   * @access public
   */
  constructor(scope: Construct, id: string, props: NextJSServerlessProps) {
    super(scope, id);

    buildNextJsProject(props.nextJSDir, props.nodeModulesDir)
      .then((outDir) => {
        if (!outDir) {
          throw new Error();
        }

        const defaultLambda = new cloudfront.experimental.EdgeFunction(this, 'NextJSServerlessDefaultLambda', {
          runtime: lambda.Runtime.NODEJS_12_X,
          handler: 'index.handler',
          code: lambda.Code.fromAsset(path.join(outDir, 'default-lambda')),
          timeout: Duration.seconds(10)
        });

        const apiLambda = new cloudfront.experimental.EdgeFunction(this, 'NextJSServerlessAPILambda', {
          runtime: lambda.Runtime.NODEJS_12_X,
          handler: 'index.handler',
          code: lambda.Code.fromAsset(path.join(outDir, 'api-lambda')),
          timeout: Duration.seconds(10),
        });

        const assetsBucket = new s3.Bucket(this, 'NextJSServerlessBucket', {});
        new s3deploy.BucketDeployment(this, 'NextJSServerlessAssets', {
          sources: [s3deploy.Source.asset(path.join(outDir, 'assets'))],
          destinationBucket: assetsBucket,
        });

        const origin = new origins.S3Origin(assetsBucket);

        // Default distribution requests to the default lambda
        const distribution = new cloudfront.Distribution(this, 'NextJSServerlessCloudfront', {
          defaultBehavior: {
            origin: origin,
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            edgeLambdas: [
              {
                functionVersion: defaultLambda.currentVersion,
                eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
              }
            ],
          }
        });

        distribution.addBehavior('_next/static/*', origin, {});

        distribution.addBehavior('api/*', origin, {
          edgeLambdas: [
            {
              functionVersion: apiLambda.currentVersion,
              eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
              includeBody: true
            },
          ],
        });

        return outDir;
      })
  }
}