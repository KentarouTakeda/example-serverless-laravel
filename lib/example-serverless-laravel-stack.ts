import { PhpFpmFunction, packagePhpCode } from '@bref.sh/constructs';
import * as cdk from 'aws-cdk-lib';
import { FunctionUrlAuthType, LogFormat } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class ExampleServerlessLaravelStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /**
     * AWS Lambdaへ設定するLaravelの環境変数
     */
    const environment = {
      APP_DEBUG: 'true',
      APP_KEY: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      LOG_CHANNEL: 'stderr',
      LOG_STDERR_FORMATTER: 'Monolog\\Formatter\\JsonFormatter',
      QUEUE_CONNECTION: 'sqs',
    };

    /**
     * `./app/` 配下のLaravelアプリケーションをAWS Lambdaへデプロイ用にパッケージング
     */
    const code = packagePhpCode('./app/', {
      bundling: {
        // Dockerの `composer` イメージでパッケージング
        image: cdk.DockerImage.fromRegistry('composer'),
        // Laravelアプリケーションのビルド - *Dockerコンテナの内部で実行される*
        command: [
          'bash',
          '-c',
          [
            `mkdir -p ${cdk.AssetStaging.BUNDLING_OUTPUT_DIR}`,
            `cp -r ${cdk.AssetStaging.BUNDLING_INPUT_DIR}/* ${cdk.AssetStaging.BUNDLING_OUTPUT_DIR}`,
            `cd ${cdk.AssetStaging.BUNDLING_OUTPUT_DIR}`,
            // **ローカル環境に存在するファイルのうちデプロイに含めてはならないファイルはビルド時に確実に削除すること**
            'find bootstrap/cache storage -type f -delete',
            'composer install --no-dev --prefer-dist --optimize-autoloader --no-scripts --classmap-authoritative',
            // **Bref Laravel Bridgeを使う場合ビルド時にconfig:cache を実行してはいけない**
            './artisan package:discover',
            './artisan route:cache',
            './artisan event:cache',
            './artisan view:cache',
          ].join(' && '),
        ],
        bundlingFileAccess: cdk.BundlingFileAccess.VOLUME_COPY,
      },
    });

    /**
     * AWSリソース: Webアプリケーションとして動作するLambda関数
     */
    const producerFunction = new PhpFpmFunction(this, 'Laravel', {
      functionName: 'example-serverless-laravel-web-app',
      // 関数ハンドラとしてLaravelのエントリーポイントを指定
      handler: 'public/index.php',
      phpVersion: '8.3',
      logFormat: LogFormat.JSON,
      code,
      environment,
    });
    // Webアプリケーションとして動作する用Lammda関数URLを作成
    producerFunction.addFunctionUrl({ authType: FunctionUrlAuthType.NONE });
  }
}
