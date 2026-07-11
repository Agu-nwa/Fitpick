type AwsCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
};

const metadataBaseUrl = "http://169.254.169.254/latest";

function envCredentials(): AwsCredentials | null {
  const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || "";
  const sessionToken = process.env.AWS_SESSION_TOKEN || "";

  if (accessKeyId && secretAccessKey) {
    return {
      accessKeyId,
      secretAccessKey,
      ...(sessionToken ? { sessionToken } : {})
    };
  }

  return null;
}

export function validateS3CredentialPair() {
  const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || "";

  if (Boolean(accessKeyId) !== Boolean(secretAccessKey)) {
    throw new Error("Provide both S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY, or leave both empty to use IAM role credentials.");
  }
}

async function fetchMetadataToken() {
  const response = await fetch(`${metadataBaseUrl}/api/token`, {
    method: "PUT",
    headers: {
      "x-aws-ec2-metadata-token-ttl-seconds": "21600"
    },
    signal: AbortSignal.timeout(1000)
  });

  if (!response.ok) throw new Error(`ec2_metadata_token_failed_${response.status}`);
  return response.text();
}

async function iamRoleCredentials(): Promise<AwsCredentials> {
  const token = await fetchMetadataToken();
  const headers = { "x-aws-ec2-metadata-token": token };

  const roleResponse = await fetch(`${metadataBaseUrl}/meta-data/iam/security-credentials/`, {
    headers,
    signal: AbortSignal.timeout(1000)
  });
  if (!roleResponse.ok) throw new Error(`ec2_iam_role_lookup_failed_${roleResponse.status}`);

  const roleName = (await roleResponse.text()).split("\n").map((value) => value.trim()).filter(Boolean)[0];
  if (!roleName) throw new Error("ec2_iam_role_missing");

  const credentialsResponse = await fetch(`${metadataBaseUrl}/meta-data/iam/security-credentials/${encodeURIComponent(roleName)}`, {
    headers,
    signal: AbortSignal.timeout(1000)
  });
  if (!credentialsResponse.ok) throw new Error(`ec2_iam_credentials_failed_${credentialsResponse.status}`);

  const payload = await credentialsResponse.json() as {
    AccessKeyId?: string;
    SecretAccessKey?: string;
    Token?: string;
  };

  if (!payload.AccessKeyId || !payload.SecretAccessKey) {
    throw new Error("ec2_iam_credentials_incomplete");
  }

  return {
    accessKeyId: payload.AccessKeyId,
    secretAccessKey: payload.SecretAccessKey,
    ...(payload.Token ? { sessionToken: payload.Token } : {})
  };
}

export async function resolveAwsCredentials() {
  validateS3CredentialPair();
  return envCredentials() || iamRoleCredentials();
}
