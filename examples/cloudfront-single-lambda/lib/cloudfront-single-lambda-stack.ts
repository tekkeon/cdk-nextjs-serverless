import * as cdk from '@aws-cdk/core';
import { NextJSServerless } from 'cdk-nextjs-serverless'

export class CloudfrontSingleLambdaStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new NextJSServerless(this, 'ExampleNextJSServerless', {
      nextJSDir: '../next-app'
    });
  }
}
