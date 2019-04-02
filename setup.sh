#!/bin/bash
source cfcreds.env

echo "Deploy Cloud Functions"
ibmcloud fn action create translateText translateText.js
ibmcloud fn action create sendSMS sendSMS.js
ibmcloud fn action create iotPub iotPub.py
ibmcloud fn action create handleIncomingSMS handleIncomingSMS.js

echo "Import service credentials to corresponding Cloud Functions"
ibmcloud fn service bind language_translator translateText
ibmcloud fn service bind language_translator handleIncomingSMS
ibmcloud fn action update iotPub -p iot_org_id "${IOT_ORG_ID}" -p iot_device_id "${IOT_DEVICE_ID}" -p iot_device_type "${IOT_DEVICE_TYPE}" -p iot_auth_token "${IOT_AUTH_TOKEN}"
ibmcloud fn action update sendSMS -p twilioNumber "${TWILIO_NUMBER}" -p twilioSid "${TWILIO_SID}" -p twilioAuthToken "${TWILIO_AUTH_TOKEN}" -p redisUsername "${REDIS_USER}" -p redisPassword "${REDIS_PASSWORD}" -p redisHost "${REDIS_HOST}" -p redisPort "${REDIS_PORT}"
ibmcloud fn action update handleIncomingSMS -p twilioNumber "${TWILIO_NUMBER}" -p twilioSid "${TWILIO_SID}" -p twilioAuthToken "${TWILIO_AUTH_TOKEN}" -p redisUsername "${REDIS_USER}" -p redisPassword "${REDIS_PASSWORD}" -p redisHost "${REDIS_HOST}" -p redisPort "${REDIS_PORT}"


echo "Create Triggers"
ibmcloud fn trigger create audioMsgReceived
ibmcloud fn trigger create txtMsgReceived
ibmcloud fn trigger create SMSMsgReceived
ibmcloud fn trigger create msgTranslated

echo "Create Rules"
# ibmcloud fn rule create RULE_NAME TRIGGER_NAME ACTION_NAME
ibmcloud fn rule create handleTxtMessage txtMsgReceived translateText
ibmcloud fn rule create handleMQTTMessage mqttMsgReceived translateText
ibmcloud fn rule create publishtoIOT msgTranslated iotPub
ibmcloud fn rule create publishtoSMS msgTranslated sendSMS
