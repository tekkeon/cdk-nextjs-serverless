# cdk-nextjs-serverless
🚀 Live Demo: https://d3027dwnjxq2g2.cloudfront.net/
## Example App Setup
### Prerequisites
* You should **have an AWS account** setup. Instructions for setting up a new account can be found [here](https://aws.amazon.com/premiumsupport/knowledge-center/create-and-activate-aws-account/). 
* **NodeJS and the npm** CLI should be installed. Install it [here](https://nodejs.org/en/).
* **AWS CDK** CLI should be installed. See instructions [here](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html).
* **AWS CLI** should be installed and a default profile configured for your AWS account. See installation and setup instructions [here](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html).
### Steps
1. Clone or download the examples directory.
2. Run `npm install` in `examples/cloudfront-single-lambda` and `examples/next-app` to install the dependencies in both packages.
3. `cd` to `examples/cloudfront-single-lambda` and run `cdk synth`. You should see that the NextJS app builds and after it's finished the CloudFormation template should be printed.
4. Assuming the previous step was successful, run `cdk deploy [--profile <PROFILE>]`. (if you don't have named profiles setup, don't include the profile argument).
5. And that's it! This will deploy all the resources including the application to AWS and immediately start serving traffic!