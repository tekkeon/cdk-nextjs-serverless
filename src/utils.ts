import path from 'path';
import fs from 'fs';
import { BuildOptions } from './types'
import { Builder } from '@sls-next/lambda-at-edge';

const OUT_DIR_NAME = 'cdk-next-serverless.out';

export function buildNextJsProject(nextJSDir: string, nodeModulesDir?: string): Promise<string | void> {
  console.log('Building NextJS app...');
  nodeModulesDir = nodeModulesDir ?? getNodeModulesDir(nextJSDir, 20);

  const options: BuildOptions = {
    cmd: './node_modules/.bin/next',
    env: {
      NODE_ENV: 'development'
    },
    cwd: nextJSDir,
    args: ['build'],
    baseDir: nextJSDir
  }

  const builder = new Builder(
    nextJSDir,
    OUT_DIR_NAME,
    options
  );

  return builder
    .build()
    .then(() => OUT_DIR_NAME)
    .catch((e: Error) => {
      console.log('Error building the NextJS application...');
      console.log(e);
    })
}

export function getNodeModulesDir(inputPath: string, maxDepth: number): string {
  if (maxDepth <= 0) {
    throw new Error(`Max depth of ${maxDepth} exceeded when searching for node_modules directory.`);
  }

  const returnPath = path.join(inputPath, './node_modules');

  if (fs.existsSync(returnPath)) {
    return returnPath
  } else {
    return getNodeModulesDir(path.join('../', returnPath), --maxDepth);
  }
}