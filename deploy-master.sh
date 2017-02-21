
aws cloudformation package \
	--template-file cloudformation/stack-template.json \
	--output-template-file cloudformation/stack-template-packaged.yaml \
	--s3-bucket gitcheese-api-build-artifacts \

aws cloudformation deploy \
	--template-file cloudformation/stack-template-packaged.yaml \
	--stack-name githceese-api-${TRAVIS_BRANCH} \
	--region us-east-1 \
	--capabilities CAPABILITY_IAM \
	--parameter-overrides ProjectName=${PROJECT_NAME} ServiceName=${SERVICE_NAME} BranchName=${TRAVIS_BRANCH} JWTSecret=${master_JWT_SECRET} GithubClientId=${master_GITHUB_CLIENT_ID} GithubClientSecret=${master_GITHUB_CLIENT_SECRET}	