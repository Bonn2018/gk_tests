/** Objects for profilesData */

export const privateKey = {
  "type": "private_key",
  "label": `Private key label ${Date.now()}`,
  "subject": "C=US, O=Let's Encrypt, CN=Let's Encrypt Authority X3",
  "ckaId": "02",
  "ckaDecrypt": true,
  "ckaSign": true,
  "ckaUnwrap": true,
  "sensitive": false,
  "extractable": true,
  "alwaysAuthenticate": false,
  "ckaPublicKeyInfo": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnNMM8FrlLke3cl03g7NoYzDq1zUmGSXhvb418XCSL7e4S0EFq6meNQhY7LEqxGiHC6PjdeTm86dicbp5gWAf15Gan_PQeGdxyGkOlZHP_uaZ6WA8SMx-yk13EiSdRxta67nsHjcAHJyse6cF6s5K671B5TaYucv9bTyWaN8jKkKQDIZ0Z8h_pZq4UmEUEz9l6YKHy9v6Dlb2honzhT-Xhq-w3Brvaw2VFn3EK6BlspkENnWAa6xK8xuQSXgvopZPKiAlKQTGdMDQMc2PMTiVFrqoM7hD8bEfwzB_onkxEz0tNvjj_PIzark5McWvxI0NHWQWM6r6hCm21AvA2H3DkwIDAQAB",
  "keyType": "RSA",
  "startDate": "2025-10-22T10:40:00.703Z",
  "endDate": "2026-10-22T10:40:00.703Z",
  "ckaDerive": false,
  "keyGenMechanism": "RSA"
}

export const publicKey = {
  "type": "public_key",
  "label": `Public key label ${Date.now()}`,
  "subject": "C=US, O=Let's Encrypt, CN=Let's Encrypt Authority X3",
  "ckaId": "03",
  "ckaEncrypt": true,
  "ckaVerify": true,
  "ckaWrap": true,
  "ckaPublicKeyInfo": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnNMM8FrlLke3cl03g7NoYzDq1zUmGSXhvb418XCSL7e4S0EFq6meNQhY7LEqxGiHC6PjdeTm86dicbp5gWAf15Gan_PQeGdxyGkOlZHP_uaZ6WA8SMx-yk13EiSdRxta67nsHjcAHJyse6cF6s5K671B5TaYucv9bTyWaN8jKkKQDIZ0Z8h_pZq4UmEUEz9l6YKHy9v6Dlb2honzhT-Xhq-w3Brvaw2VFn3EK6BlspkENnWAa6xK8xuQSXgvopZPKiAlKQTGdMDQMc2PMTiVFrqoM7hD8bEfwzB_onkxEz0tNvjj_PIzark5McWvxI0NHWQWM6r6hCm21AvA2H3DkwIDAQAB",
  "keyType": "RSA",
  "startDate": "2025-10-22T10:40:00.703Z",
  "endDate": "2026-10-22T10:40:00.703Z",
  "ckaDerive": false,
  "keyGenMechanism": "RSA"
}

export const certificate = {
  "type": "x509",
  "label": `Certificate label ${Date.now()}`,
  "subject": "C=US, O=Let's Encrypt, CN=Let's Encrypt Authority X3",
  "issuer": "O=Digital Signature Trust Co., CN=DST Root CA X3",
  "ckaId": "04",
  "ckaPublicKeyInfo": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnNMM8FrlLke3cl03g7NoYzDq1zUmGSXhvb418XCSL7e4S0EFq6meNQhY7LEqxGiHC6PjdeTm86dicbp5gWAf15Gan_PQeGdxyGkOlZHP_uaZ6WA8SMx-yk13EiSdRxta67nsHjcAHJyse6cF6s5K671B5TaYucv9bTyWaN8jKkKQDIZ0Z8h_pZq4UmEUEz9l6YKHy9v6Dlb2honzhT-Xhq-w3Brvaw2VFn3EK6BlspkENnWAa6xK8xuQSXgvopZPKiAlKQTGdMDQMc2PMTiVFrqoM7hD8bEfwzB_onkxEz0tNvjj_PIzark5McWvxI0NHWQWM6r6hCm21AvA2H3DkwIDAQAB",
  "startDate": "2025-10-22T10:40:00.703Z",
  "endDate": "2026-10-22T10:40:00.703Z",
  "serialNumber": "0a0141420000015385736a0b85eca708",
  "ckaValue": "MIIEkjCCA3qgAwIBAgIQCgFBQgAAAVOFc2oLheynCDANBgkqhkiG9w0BAQsFADA_MSQwIgYDVQQKExtEaWdpdGFsIFNpZ25hdHVyZSBUcnVzdCBDby4xFzAVBgNVBAMTDkRTVCBSb290IENBIFgzMB4XDTE2MDMxNzE2NDA0NloXDTIxMDMxNzE2NDA0NlowSjELMAkGA1UEBhMCVVMxFjAUBgNVBAoTDUxldCdzIEVuY3J5cHQxIzAhBgNVBAMTGkxldCdzIEVuY3J5cHQgQXV0aG9yaXR5IFgzMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnNMM8FrlLke3cl03g7NoYzDq1zUmGSXhvb418XCSL7e4S0EFq6meNQhY7LEqxGiHC6PjdeTm86dicbp5gWAf15Gan_PQeGdxyGkOlZHP_uaZ6WA8SMx-yk13EiSdRxta67nsHjcAHJyse6cF6s5K671B5TaYucv9bTyWaN8jKkKQDIZ0Z8h_pZq4UmEUEz9l6YKHy9v6Dlb2honzhT-Xhq-w3Brvaw2VFn3EK6BlspkENnWAa6xK8xuQSXgvopZPKiAlKQTGdMDQMc2PMTiVFrqoM7hD8bEfwzB_onkxEz0tNvjj_PIzark5McWvxI0NHWQWM6r6hCm21AvA2H3DkwIDAQABo4IBfTCCAXkwEgYDVR0TAQH_BAgwBgEB_wIBADAOBgNVHQ8BAf8EBAMCAYYwfwYIKwYBBQUHAQEEczBxMDIGCCsGAQUFBzABhiZodHRwOi8vaXNyZy50cnVzdGlkLm9jc3AuaWRlbnRydXN0LmNvbTA7BggrBgEFBQcwAoYvaHR0cDovL2FwcHMuaWRlbnRydXN0LmNvbS9yb290cy9kc3Ryb290Y2F4My5wN2MwHwYDVR0jBBgwFoAUxKexpHsscfrb4UuQdf_EFWCFiRAwVAYDVR0gBE0wSzAIBgZngQwBAgEwPwYLKwYBBAGC3xMBAQEwMDAuBggrBgEFBQcCARYiaHR0cDovL2Nwcy5yb290LXgxLmxldHNlbmNyeXB0Lm9yZzA8BgNVHR8ENTAzMDGgL6AthitodHRwOi8vY3JsLmlkZW50cnVzdC5jb20vRFNUUk9PVENBWDNDUkwuY3JsMB0GA1UdDgQWBBSoSmpjBH3duubRObemRWXv86jsoTANBgkqhkiG9w0BAQsFAAOCAQEA3TPXEfNjWDjdGBX7CVW-dla5cEilaUcne8IkCJLxWh9KEik3JHRRHGJouM2VcGfl96S8TihRzZvoroed6ti6WqEBmtzw3Wodatg-VyOeph4EYpr_1wXKtx8_wApIvJSwtmVi4MFU5aMqrSDE6ea73Mj2tcMyo5jMd6jmeWUHK8so_joWUoHOUgwuX4Po1QYz-3dszkDqMp4fklxBwXRsW10KXzPMTZ-sOPAveyxindmjkW8lGy-QsRlGPfZ-G6Z6h7mjem0Y-iWlkYcV4PIWL1iwBi8saCbGS5jN2p8M-X-Q7UNKEkROb3N6KOqkqm57TH2H3eDJAkSnh6_DNFu0Qg"
}

export const data = {
  "type": "data",
  "label": `Data label ${Date.now()}`,
  "application": "application",
  "objectId": "1.2.3.4.5",
  "value": "AQAB"
}
