#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ExampleServerlessLaravelStack } from '../lib/example-serverless-laravel-stack';

const app = new cdk.App();
new ExampleServerlessLaravelStack(app, 'ExampleServerlessLaravelStack', {
  env: { region: 'ap-northeast-1' },
});