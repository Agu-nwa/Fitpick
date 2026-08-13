# MyFitPick GitHub Build and Production Deployment Pipeline

## Architecture

Pull requests and pushes to `main` run `.github/workflows/ci.yml`. A successful `main` build triggers `.github/workflows/deploy-production.yml`. GitHub exchanges its OIDC token for a short-lived AWS role session, sends the exact verified commit SHA to the EC2 instance through Systems Manager, and never opens SSH or copies production secrets into GitHub.

The EC2 deployment creates an isolated Git worktree under `/home/ubuntu/fitpick-releases`, copies the active release's protected `.env.local`, installs locked dependencies, validates and builds the new release, atomically switches every PM2 process, and verifies both local and public deployment identity. A failed post-switch verification restores the previous PM2 release.

## Required GitHub environment

Create a GitHub environment named `production`. Protect it with required reviewers if approval before every production deployment is desired.

Add one environment secret:

- `AWS_DEPLOY_ROLE_ARN`: ARN of the GitHub OIDC deployment role.

Add two environment variables:

- `AWS_REGION`: for example `ca-central-1`.
- `EC2_INSTANCE_ID`: the production instance ID.

Do not add `.env.local`, MongoDB, payment, OpenAI, storage, JWT, or provider secrets to GitHub Actions. They remain on EC2.

## AWS prerequisites

1. Ensure the EC2 SSM agent is online and the instance role includes `AmazonSSMManagedInstanceCore` or equivalent least-privilege permissions.
2. Configure the GitHub OIDC identity provider `token.actions.githubusercontent.com` in AWS IAM.
3. Create a deployment role whose trust policy is restricted to this repository and the `production` GitHub environment.
4. Give that role only `ssm:SendCommand`, `ssm:GetCommandInvocation`, and `ssm:ListCommandInvocations` for the production instance and the `AWS-RunShellScript` document.

Example trust-policy condition:

```json
{
  "StringEquals": {
    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
  },
  "StringLike": {
    "token.actions.githubusercontent.com:sub": "repo:Agu-nwa/Fitpick:environment:production"
  }
}
```

Use the exact repository owner/name capitalization shown by GitHub.

## First deployment prerequisite

The source checkout must exist at `/home/ubuntu/Fitpick`, be readable by `ubuntu`, have `origin` configured, and contain the production `.env.local`. PM2 must run under `ubuntu`. Install `flock`, Git, Node.js 20, npm, PM2, and the SSM agent.

Before enabling automatic deployment, manually place `scripts/deploy-production-release.sh` on `main`. The workflow retrieves the script from the exact commit being deployed, not from the currently checked-out server branch.

## Release and rollback behavior

- Only a CI-successful commit from `main` deploys automatically.
- Deployments are serialized; a second production deployment waits.
- The currently served `.next` directory is never rebuilt in place.
- The exact twelve-character Git SHA is exposed by `/api/health` and verified after the switch.
- Failed builds never restart PM2.
- Failed runtime verification switches PM2 back to its previous release directory.
- Old release deletion is intentionally not automated. Keep at least two verified releases and clean up separately.

## Manual deployment

Use **Actions → Deploy MyFitPick Production → Run workflow**. Leave the SHA empty to deploy the selected `main` revision, or provide a full 40-character commit SHA already present in the repository.

## Production caveats

PM2's process switch can cause a short connection interruption on a single EC2 host. True zero-downtime and host-level high availability require at least two instances behind a load balancer. Database migrations and taxonomy backfills are deliberately excluded from this pipeline and require a separate reviewed operation and backup.
