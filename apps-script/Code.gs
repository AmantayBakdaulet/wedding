/**
 * Wedding RSVP — Google Apps Script
 * Колонки Sheet: Дата | Аты-жөні | Келеді | Қанша адам
 */

var SHEET_NAME = 'RSVP';

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return jsonResponse({ status: 'ok', message: 'Wedding RSVP endpoint is running.' });
}

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var data;
    try { data = JSON.parse(raw); }
    catch (err) { return jsonResponse({ result: 'error', message: 'JSON parse error' }); }

    if (!data.name || String(data.name).trim() === '') {
      return jsonResponse({ result: 'error', message: 'name is required' });
    }
    if (data.attending !== 'yes' && data.attending !== 'no') {
      return jsonResponse({ result: 'error', message: 'attending must be yes or no' });
    }

    var name      = String(data.name).trim().substring(0, 200);
    var attending = data.attending === 'yes' ? 'Иә' : 'Жоқ';
    var guests    = data.attending === 'yes' ? (parseInt(data.guests, 10) || 1) : 0;
    var timestamp = new Date();

    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(['Дата', 'Аты-жөні', 'Келеді', 'Қанша адам']);
      sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
    }

    sheet.appendRow([timestamp, name, attending, guests]);

    sendWhatsApp(name, attending, guests);

    return jsonResponse({ result: 'success' });

  } catch (err) {
    console.error('doPost error:', err);
    return jsonResponse({ result: 'error', message: err.message || 'Unknown error' });
  }
}

function sendWhatsApp(name, attending, guests) {
  var props      = PropertiesService.getScriptProperties();
  var accountSid = props.getProperty('TWILIO_ACCOUNT_SID');
  var authToken  = props.getProperty('TWILIO_AUTH_TOKEN');

  var body = '🎊 Жаңа RSVP!\n'
    + 'Аты: ' + name + '\n'
    + 'Келуі: ' + (attending === 'Иә' ? 'Иә ✅' : 'Жоқ ❌')
    + (attending === 'Иә' ? '\nАдам саны: ' + guests : '');

  var response = UrlFetchApp.fetch(
    'https://api.twilio.com/2010-04-01/Accounts/' + accountSid + '/Messages.json',
    {
      method: 'post',
      headers: {
        Authorization: 'Basic ' + Utilities.base64Encode(accountSid + ':' + authToken)
      },
      payload: {
        From: 'whatsapp:+14155238886',
        To:   'whatsapp:+77089046229',
        Body: body
      },
      muteHttpExceptions: true
    }
  );
  console.log(response.getContentText());
}
