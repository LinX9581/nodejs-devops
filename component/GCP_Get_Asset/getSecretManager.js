import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const accessSecretVersion = async () => {
  const client = new SecretManagerServiceClient();

  const secretName = 'projects/733814264684/secrets/devops-service-account-key/versions/1';

  const [version] = await client.accessSecretVersion({
    name: secretName,
  });

  const payload = version.payload.data.toString('utf8');
  
  return payload;
};

// accessSecretVersion()
//   .then((payload) => console.log('Secret:', payload))   
//   .catch((error) => console.error('Error accessing secret:', error));
