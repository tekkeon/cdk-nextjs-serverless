import * as lambda from '@aws-cdk/aws-lambda';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as logs from '@aws-cdk/aws-logs';
import * as origins from '@aws-cdk/aws-cloudfront-origins'
import * as s3 from '@aws-cdk/aws-s3';
import * as s3deploy from '@aws-cdk/aws-s3-deployment'
import { Construct, Duration } from '@aws-cdk/core';
import path from 'path';
import { buildNextJsProject } from './utils';
import { BucketDeploymentProps } from '@aws-cdk/aws-s3-deployment';

export enum NextJSServerlessDeployment {
  CloudFrontMinimal,
  CloudFrontSplitRoutes,
  CloudFrontToAPIGateway,
  APIGatewayOnly
}

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
   * (NOT YET FUNCTIONAL) Type of deployment. See documentation for how this differs the architecture.
   *
   * @default - CloudFrontOnlyMinimal
   */
  readonly deploymentType?: NextJSServerlessDeployment
  /**
   * (Optional) Lambda function props to use for the NextJS rendering and API Lambdas.
   *
   * @default - None
   */
  readonly lambdaFunctionProps?: Partial<lambda.FunctionProps>
  /**
   * (Optional) Props to override the default props for the CloudFront distribution.
   *
   * @default - Default props are used
   */
  readonly cloudFrontDistributionProps?: Partial<cloudfront.DistributionProps>
  /**
   * (Optional)
   * 
   * @default true
   */
  readonly invalidateOnDeploy?: boolean;
}

const defaultLambdaFunctionProps: lambda.FunctionProps = {
  runtime: lambda.Runtime.NODEJS_12_X,
  handler: '',
  code: lambda.Code.fromAsset(''),
  timeout: Duration.seconds(10)
}

export class NextJSServerless extends Construct {
  public cloudFrontLoggingBucket?: s3.Bucket;
  public cloudFrontWebDistribution?: cloudfront.Distribution;
  public edgeLambdaFunctionVersion?: lambda.Version;
  public lambdaFunctionVersions: lambda.IVersion[];
  public staticAssetsBucket?: s3.Bucket;
  
  private buildPromise: Promise<NextJSServerless>;

  /**
   * @summary Constructs a new instance of the NextJSServerless class.
   * @param {cdk.App} scope - represents the scope for all the resources.
   * @param {string} id - this is a a scope-unique id.
   * @param {NextJSServerlessProps} props - user provided props for the construct
   * @access public
   */
  constructor(scope: Construct, id: string, props: NextJSServerlessProps) {
    super(scope, id);

    this.lambdaFunctionVersions = [];

    this.buildPromise = buildNextJsProject(props.nextJSDir, props.nodeModulesDir)
      .then((outDir) => {
        if (!outDir) {
          throw new Error();
        }

        // Lambda Functions
        var edgeFunctionProps: cloudfront.experimental.EdgeFunctionProps = {
          ...defaultLambdaFunctionProps,
          ...props.lambdaFunctionProps
        }

        const defaultLambda = new cloudfront.experimental.EdgeFunction(this, 'NextJSServerlessDefaultLambda', {
          ...edgeFunctionProps,
          handler: 'index.handler',
          code: lambda.Code.fromAsset(path.join(outDir, 'default-lambda'))
        });

        const apiLambda = new cloudfront.experimental.EdgeFunction(this, 'NextJSServerlessAPILambda', {
          ...edgeFunctionProps,
          handler: 'index.handler',
          code: lambda.Code.fromAsset(path.join(outDir, 'api-lambda')),
        });

        this.lambdaFunctionVersions.push(defaultLambda, apiLambda);

        // S3 Buckets
        this.staticAssetsBucket = new s3.Bucket(this, 'NextJSServerlessBucket');
        this.cloudFrontLoggingBucket = new s3.Bucket(this, 'NextJSServerlessLogBucket');

        const origin = new origins.S3Origin(this.staticAssetsBucket);

        // CloudFront Distribution
        this.cloudFrontWebDistribution = new cloudfront.Distribution(this, 'NextJSServerlessCloudfront', {
          ...props.cloudFrontDistributionProps,
          defaultBehavior: {
            ...props.cloudFrontDistributionProps?.defaultBehavior,
            origin,
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            edgeLambdas: [
              {
                functionVersion: defaultLambda.currentVersion,
                eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
              }
            ]
          },
          additionalBehaviors: {
            ...props.cloudFrontDistributionProps?.additionalBehaviors,
            '_next/static/*': {
              origin
            },
            'api/*': {
              origin,
              edgeLambdas: [
                {
                  functionVersion: apiLambda.currentVersion,
                  eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
                  includeBody: true
                }
              ]
            }
          },
          logBucket: this.cloudFrontLoggingBucket,
        });

        let bucketDeploymentProps: BucketDeploymentProps = {
          sources: [
            s3deploy.Source.asset(path.join(outDir, 'assets'))
          ],
          destinationBucket: this.staticAssetsBucket,
        }

        // Can't use !props.invalidateOnDeploy because if it's undefined, it would be falsy
        // and the default should be true
        if (props.invalidateOnDeploy !== false) {
          bucketDeploymentProps = {
            ...bucketDeploymentProps,
            distribution: this.cloudFrontWebDistribution,
            distributionPaths: ['/*']
          }
        }

        new s3deploy.BucketDeployment(this, 'NextJSServerlessAssets', bucketDeploymentProps);
      }).then(() => {
        return this;
      })
  }

  promise() {
    return this.buildPromise;
  }
}