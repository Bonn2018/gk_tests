import { getTokenMetadata, registerAuthentificator } from "../../api";
import crypto from "crypto";
import { certificate, data, publicKey, privateKey } from "./authentificator_testdata";

function getTestPayload(organizationId: string) {
  const randomProductName = crypto.randomUUID().slice(0, 5);
  //* Objects for profilesData *//
  return {
    "productId": "yubikey_5c_nfc", // safenet_5110
    "serialNumber": `0000${Date.now().toString().slice(-4)}`,
    "label": `Test card ${randomProductName}`,
    "credentials": [
      {
          "profileType": "piv",
          "type": "mgmKey",
          "value": "1234567"
      },
      {
          "profileType": "piv",
          "type": "puk",
          "value": "7654321"
      },
      {
          "profileType": "pkcs11",
          "type": "password",
          "value": "777777"
      },
      {
          "profileType": "fido2",
          "type": "password",
          "value": "777777",
          "meta": {
              "someKey": "someValue"
          }
      }
    ],
    "firmware": "7.7.7",
    "profilesData": {
      "piv": { // pkcs11
          "info": {
              "status": "active"
          },
          "objects": [
              data,
              privateKey,
              publicKey,
              certificate,
          ]
      },
      "fido2": {
          "info": {
            "status": "active"
          },
          "objects": [
            {
              "type": "fido2-credential",
              "rp": {
                  "id": "google.com"
              },
              "user": {
                  "id": "474f4f474c455f4143434f554e543a313036343231343833313030353236303939343836",
                  "name": "alexander.slobodian@peculiarventures.com",
                  "displayName": "Alexander Slobodian"
              }
          },
          ],
      }
    }
  }
}

describe('Register Authentificator', () => {
  test('should register authentificator', async () => {
    const ACCESS_TOKEN = process.env.API_SIGNING_ACCESS_TOKEN;
    // const CERTIFICATE_ID = process.env.TEST_SIGNING_CERTIFICATE_ID;

    if (!ACCESS_TOKEN) {
      throw new Error('API_SIGNING_ACCESS_TOKEN is required. Set env or run: npm run prepare_env -- -t YOUR_TOKEN');
    }

    const { organization } = await getTokenMetadata(ACCESS_TOKEN);
    const testPayload = getTestPayload(organization.id);
    const result = await registerAuthentificator(
      ACCESS_TOKEN,
      organization.id,
      testPayload
    );
    console.log('result=', result);
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });
});
