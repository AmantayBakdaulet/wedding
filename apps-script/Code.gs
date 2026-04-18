/**
 * Wedding RSVP — Google Apps Script
 * Принимает POST-запросы от формы и пишет строки в Google Sheet.
 *
 * Настройка:
 *  1. Задайте SHEET_NAME равным имени листа в вашей таблице (по умолчанию "RSVP").
 *  2. Разверните как веб-приложение:
 *     Развернуть → Новое развёртывание → Тип: Веб-приложение
 *     Выполнять как: Я | Доступ: Все
 */

var SHEET_NAME = 'RSVP';

/* ────────────────────────────────────────────────────────
   CORS headers — нужны для fetch из браузера
──────────────────────────────────────────────────────── */
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(data, code) {
  code = code || 200;
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ────────────────────────────────────────────────────────
   doGet — health check
   GET https://script.google.com/macros/s/XXXXX/exec
──────────────────────────────────────────────────────── */
function doGet(e) {
  return jsonResponse({ status: 'ok', message: 'Wedding RSVP endpoint is running.' });
}

/* ────────────────────────────────────────────────────────
   doPost — принимает RSVP и пишет в Sheet
   Ожидаемый JSON body:
   {
     "name":      "Имя Фамилия",
     "attending": "yes" | "no",
     "guests":    2,          // число (0 если не приходит)
     "diet":      "...",      // необязательно
     "wish":      "..."       // необязательно
   }
──────────────────────────────────────────────────────── */
function doPost(e) {
  try {
    // Парсим тело запроса
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var data;
    try {
      data = JSON.parse(raw);
    } catch (parseErr) {
      return jsonResponse({ result: 'error', message: 'JSON parse error: ' + parseErr.message });
    }

    // Валидация обязательных полей
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      return jsonResponse({ result: 'error', message: 'name is required' });
    }
    if (data.attending !== 'yes' && data.attending !== 'no') {
      return jsonResponse({ result: 'error', message: 'attending must be "yes" or "no"' });
    }

    // Нормализуем данные
    var name      = String(data.name).trim().substring(0, 200);
    var attending = data.attending === 'yes' ? 'Иә' : 'Жоқ';
    var guests    = data.attending === 'yes' ? (parseInt(data.guests, 10) || 1) : 0;
    var diet      = data.diet  ? String(data.diet).trim().substring(0, 500)  : '';
    var wish      = data.wish  ? String(data.wish).trim().substring(0, 1000) : '';
    var timestamp = new Date();

    // Открываем таблицу и лист
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      // Создаём лист с заголовками, если не существует
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(['Дата', 'Аты-жөні', 'Келеді', 'Қанша адам', 'Тағам', 'Тілек']);
      sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
    }

    // Добавляем строку
    sheet.appendRow([timestamp, name, attending, guests, diet, wish]);

    return jsonResponse({ result: 'success' });

  } catch (err) {
    // Логируем ошибку (видна в Apps Script → Выполнения)
    console.error('doPost error:', err);
    return jsonResponse({ result: 'error', message: err.message || 'Unknown server error' });
  }
}
