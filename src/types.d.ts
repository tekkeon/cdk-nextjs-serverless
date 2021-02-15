// From @sls/lambda-at-edge
export type BuildOptions = {
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  cmd?: string;
  useServerlessTraceTarget?: boolean;
  logLambdaExecutionTimes?: boolean;
  domainRedirects?: {
      [key: string]: string;
  };
  minifyHandlers?: boolean;
  enableHTTPCompression?: boolean;
  handler?: string;
  authentication?: {
      username: string;
      password: string;
  } | undefined;
  resolve?: (id: string, parent: string, job: Job, cjsResolve: boolean) => string | string[];
  baseDir?: string;
};