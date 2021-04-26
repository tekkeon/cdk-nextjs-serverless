#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CloudfrontSingleLambdaStack } from '../lib/cloudfront-single-lambda-stack';

const app = new cdk.App();
new CloudfrontSingleLambdaStack(app, 'CloudfrontSingleLambdaStack', {
  env: {
    region: 'us-east-1'
  }
});
