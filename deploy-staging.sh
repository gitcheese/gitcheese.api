
aws cloudformation package \
	--template-file cloudformation/stack-template.json \
	--output-template-file cloudformation/stack-template-packaged.yaml \
	--s3-bucket gitcheese-api-build-artifacts \
	--profile gitcheese

aws cloudformation deploy \
	--template-file cloudformation/stack-template-packaged.yaml \
	--stack-name githceese-api-staging \
	--profile gitcheese \
	--region us-east-1 \
	--capabilities CAPABILITY_IAM \