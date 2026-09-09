/**
 * EMS & REFER — Google Apps Script backend
 * ผูกกับ Google Sheet ของหน่วยงานตัวเอง (Container-bound script)
 *
 * วิธีติดตั้ง: ดูไฟล์ "วิธีติดตั้ง.html" / README ที่แนบมาด้วย
 */

var TZ = Session.getScriptTimeZone() || 'Asia/Bangkok';

function doGet(e) {
  if (e && e.parameter && e.parameter.view === 'als' && e.parameter.id) {
    return HtmlService.createHtmlOutput(buildALSFormHtml_(e.parameter.id))
      .setTitle('แบบบันทึก ALS')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  if (e && e.parameter && e.parameter.view === 'als_blank') {
    return HtmlService.createHtmlOutput(buildBlankALSFormHtml_())
      .setTitle('แบบบันทึก ALS (เปล่า)')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  if (e && e.parameter && e.parameter.view === 'refer' && e.parameter.id) {
    return HtmlService.createHtmlOutput(buildReferFormHtml_(e.parameter.id))
      .setTitle('แบบบันทึก REFER')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  if (e && e.parameter && e.parameter.view === 'summary') {
    return HtmlService.createHtmlOutput(buildSummaryHtml_(e.parameter.ym))
      .setTitle('สรุป EMS & REFER')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  var tmpl = HtmlService.createTemplateFromFile('Index');
  tmpl.appUrl = ScriptApp.getService().getUrl();
  return tmpl.evaluate()
    .setTitle('NKT Rescue')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function monthKey_(dateStr) {
  if (!dateStr) {
    dateStr = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  }
  return dateStr.substring(0, 7); // YYYY-MM
}

function monthLabelThai_(ym) {
  var months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  var parts = ym.split('-');
  var y = parseInt(parts[0], 10) + 543;
  var m = parseInt(parts[1], 10) - 1;
  return months[m] + ' ' + y;
}

var EMS_HEADERS = [
  'บันทึกเมื่อ', 'วันที่', 'เวร', 'ลำดับ', 'เลขปฏิบัติการ',
  'จนท.RN', 'จนท.AEMT', 'จนท.พขร',
  'รับแจ้งจาก', 'ประเภทเหตุการณ์', 'เหตุการณ์', 'สถานที่', 'เบอร์ผู้แจ้ง',
  'ระดับความรุนแรง', 'ประเภท', 'พบเหตุ',
  'เวลารับแจ้ง', 'เวลาสั่งการ', 'เวลาออกฐาน', 'เวลาถึงเหตุ', 'เวลาออกเหตุ', 'เวลาถึงรพ.', 'เวลาถึงฐาน',
  'ไมล์ออก', 'ไมล์ถึงเหตุ', 'ไมล์ถึงรพ.', 'ไมล์ถึงฐาน', 'ระยะทางรวม(กม.)',
  'ชื่อผู้ป่วย', 'อายุ', 'ID', 'HN', 'ที่อยู่', 'อาการ', 'DX',
  'BP', 'PR', 'RR', 'BT', 'O2sat', 'GCS_E', 'GCS_V', 'GCS_M', 'GCS รวม', 'Pupil ซ้าย', 'DTX',
  'Treatment', 'ผลการรักษา', 'ส่งต่อ รพ.', 'ผู้บันทึก (รหัส)',
  'จนท.ผู้ช่วยเหลือ(PN/NA)',
  'บาดแผล', 'กระดูกผิดรูป', 'การเสียเลือด', 'อวัยวะที่บาดเจ็บ',
  'อายุรกรรม', 'สูติ-นรีเวช', 'กุมารเวชกรรม', 'ศัลยกรรม', 'อื่นๆ(Non-trauma)',
  'ทางเดินหายใจ/การหายใจ', 'บาดแผล/ห้ามเลือด(Treatment)', 'การให้สารน้ำ', 'ดามกระดูก', 'การทำ CPR',
  'ผลการดูแลรักษาขั้นต้น',
  'ลายเซ็นญาติ(เสียชีวิต ณ จุดเกิดเหตุ)', 'ชื่อญาติผู้เซ็นรับทราบ',
  'รูปถ่ายยืนยัน(เสียชีวิต ณ จุดเกิดเหตุ)',
  'สัญชาติ/ประเภทผู้ป่วย', 'รายละเอียดสัญชาติ/แรงงานต่างด้าว', 'สิทธิการรักษา',
  'ชุดสัญญาณชีพเพิ่มเติม(JSON)',
  'ผู้สรุปรายงาน(เลือกชื่อ)', 'ชื่อผู้ประเมิน(RN)',
  'รักษาประคับประครองตามอาการ', 'ลายเซ็นญาติ(รักษาประคับประครอง)', 'ชื่อผู้เซ็นรับทราบ(รักษาประคับประครอง)',
  'สร้างเมื่อ(ครั้งแรก)',
  'Pupil ขวา'
];

var REFER_HEADERS = [
  'บันทึกเมื่อ', 'วันที่', 'ชื่อผู้ป่วย', 'HN', 'อายุ', 'DX',
  'ส่งต่อโรงพยาบาล', 'ทีมนำส่ง', 'ระดับความรุนแรง', 'ผู้บันทึก (รหัส)',
  'ประเภท (Trauma/Non-Trauma)'
];

// รายชื่อโรงพยาบาลให้เลือกในแบบบันทึก REFER
var REFER_HOSPITALS = [
  'รพ.พุทธชินราช', 'รพ.มหาวิทยาลัยนเรศวร', 'รพ.ค่ายสมเด็จพระนเรศวรมหาราช',
  'รพ.จิตเวชพิษณุโลก', 'รพ.ชาติตระการ', 'รพ.เนินมะปราง', 'รพ.บางกระทุ่ม',
  'รพ.บางระกำ', 'รพ.พรหมพิราม', 'รพ.วังทอง', 'รพ.วัดโบสถ์'
];

// 11 ตำบลในเขตพื้นที่ (ต้องตรงกับตัวเลือกในช่อง "ที่อยู่" ของฟอร์ม EMS)
var EMS_AREAS = [
  'นครไทย', 'หนองกระท้าว', 'นาบัว', 'เนินเพิ่ม', 'บ้านพร้าว', 'บ่อโพธิ์',
  'ยางโกลน', 'ห้วยเฮี้ย', 'นครชุม', 'น้ำกุ่ม', 'นอกเขต'
];

// รายชื่อ RN/AEMT (ต้องตรงกับ RN_NAMES/AEMT_NAMES ใน Index.html) ใช้เพื่อเดาตำแหน่งของชื่อที่เลือกในช่อง
// "เจ้าหน้าที่ผู้ให้บริการ 1/2" (เลือกได้ทั้ง RN และ AEMT) แล้วต่อท้าย (RN)/(AEMT) ให้ถูกต้องตอนพิมพ์ฟอร์ม
var RN_NAMES_ = ['ยุทธพล', 'อรุณี', 'กนกวรรณ', 'นิชธาวัลย์', 'กลศาสตร์', 'เทอดพงษ์', 'วิภาลัย', 'จีระศักดิ์', 'กัญญา', 'นภเกตน์', 'สิริณัฐฐา'];
var AEMT_NAMES_ = ['พัชรพร', 'จิตรานุช', 'ณัฎฐ์นรี', 'วรรณา', 'ณัฐริกา'];

// ต่อท้ายชื่อด้วย (RN) หรือ (AEMT) ตามรายชื่อที่ตรงกัน ถ้าไม่ตรงกับรายชื่อไหนเลย (เช่นพิมพ์เอง) จะคืนชื่อเดิมไม่ต่อท้าย
function withStaffRole_(name) {
  if (!name) return name;
  if (RN_NAMES_.indexOf(name) !== -1) return name + ' (RN)';
  if (AEMT_NAMES_.indexOf(name) !== -1) return name + ' (AEMT)';
  return name;
}

var LOGIN_HEADERS = ['เวลา', 'รหัสเจ้าหน้าที่', 'การทำงาน'];

// รหัสเจ้าหน้าที่ที่อนุญาต: ERNKT001-ERNKT016 (ใช้รหัสเดียวกันทั้ง ID และ Password)
var STAFF_CODES = (function () {
  var arr = [];
  for (var i = 1; i <= 16; i++) {
    arr.push('ERNKT' + ('00' + i).slice(-3));
  }
  return arr;
})();

function login(id, password) {
  id = String(id || '').trim().toUpperCase();
  password = String(password || '').trim().toUpperCase();
  if (STAFF_CODES.indexOf(id) === -1) {
    return { ok: false, message: 'ไม่พบรหัสนี้ในระบบ' };
  }
  if (id !== password) {
    return { ok: false, message: 'รหัสผ่านไม่ถูกต้อง' };
  }
  logLogin_(id, 'เข้าระบบ');
  return { ok: true, id: id };
}

function logout(id) {
  if (id) logLogin_(id, 'ออกจากระบบ');
  return { ok: true };
}

function logLogin_(id, action) {
  var sh = getOrCreateSheet_('บันทึกเข้าระบบ', LOGIN_HEADERS);
  var now = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss');
  sh.appendRow([now, id, action]);
}

function getOrCreateSheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold').setBackground('#1a73e8').setFontColor('#ffffff');
    sh.autoResizeColumns(1, headers.length);
  }
  return sh;
}

function getServerTime() {
  return {
    date: Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'),
    time: Utilities.formatDate(new Date(), TZ, 'HH:mm')
  };
}

// อัปโหลดรูปถ่าย (base64 dataURL จากฟอร์ม) เก็บลง Google Drive แล้วคืนลิงก์รูปสำหรับเก็บในชีต
// ถ้า input ไม่ใช่ dataURL ใหม่ (เช่น เป็นลิงก์เดิม หรือค่าว่าง) จะคืนค่าเดิมกลับไปเลยโดยไม่อัปโหลดซ้ำ
function saveDeathPhotoIfNew_(value, opNo) {
  if (!value) return '';
  if (String(value).indexOf('data:') !== 0) return value; // เป็นลิงก์เดิมอยู่แล้ว ไม่ต้องอัปโหลดใหม่
  try {
    var m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/.exec(value);
    if (!m) return '';
    var mimeType = m[1];
    var b64 = m[2];
    var ext = mimeType.indexOf('png') !== -1 ? 'png' : 'jpg';
    var bytes = Utilities.base64Decode(b64);
    var blob = Utilities.newBlob(bytes, mimeType, 'death_photo_' + (opNo || Date.now()) + '_' + Date.now() + '.' + ext);
    var folder = getOrCreateDriveFolder_('NKT Rescue - รูปถ่ายยืนยันการเสียชีวิต ณ จุดเกิดเหตุ');
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return 'https://drive.google.com/uc?export=view&id=' + file.getId();
  } catch (e) {
    return ''; // ถ้าอัปโหลดไม่สำเร็จ ไม่ให้กระทบการบันทึกข้อมูลหลัก
  }
}

function getOrCreateDriveFolder_(name) {
  var it = DriveApp.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(name);
}

// นับจำนวนเคสที่มีอยู่แล้วในวันที่ระบุ (จากชีทเดือนเดียวกัน) แล้วคืนลำดับถัดไป (เหตุที่ 1,2,3,...ต่อวัน)
// ฟิกไว้ตายตัวโดยระบบเสมอ ไม่ให้ผู้ใช้พิมพ์เอง เพื่อกันลำดับซ้ำ/สลับกัน
function computeNextSeq_(sh, dateStr) {
  if (!sh || sh.getLastRow() < 2) return 1;
  var dateVals = sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues(); // คอลัมน์ 'วันที่'
  var count = 0;
  dateVals.forEach(function (r) {
    var v = r[0];
    var s = (v instanceof Date) ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd') : String(v || '');
    if (s === dateStr) count++;
  });
  return count + 1;
}

// เรียกจากหน้าเว็บก่อนบันทึกจริง เพื่อโชว์ตัวอย่างเลขลำดับ "เหตุที่ N" ของวันที่เลือกให้ผู้ใช้เห็นทันที
function previewNextSeq(dateStr) {
  var ym = monthKey_(dateStr);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('EMS_' + ym);
  return computeNextSeq_(sh, dateStr);
}

function saveEMS(data) {
  var ym = monthKey_(data.date);
  var sheetName = 'EMS_' + ym;
  var sh = getOrCreateSheet_(sheetName, EMS_HEADERS);
  var now = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss');
  // ลำดับผู้ป่วย (CN) ฟิกไว้เลยว่าเป็นเหตุที่ 1,2,3,...n ของวันนั้นๆ คำนวณจากระบบเสมอ ไม่ใช้ค่าที่พิมพ์มาจากฟอร์ม
  var seq = computeNextSeq_(sh, data.date);
  var row = [
    now, data.date, data.shift, seq, data.opNo,
    data.staffRN, data.staffAEMT, data.staffDriver,
    data.receivedFrom, data.incidentType, data.incident, data.location, data.callerPhone,
    data.severity, data.traumaType, data.found,
    data.tReceived, data.tDispatch, data.tDepartStation, data.tArriveScene,
    data.tDepartScene, data.tArriveHospital, data.tArriveStation,
    data.mileOut, data.mileScene, data.mileHospital, data.mileStation, data.totalKm,
    data.patientName, data.age, data.patientId, data.hn, data.address, data.symptoms, data.dx,
    data.bp, data.pr, data.rr, data.bt, data.o2sat,
    data.gcsE, data.gcsV, data.gcsM, data.gcsTotal, data.pupilL, data.dtx,
    data.treatment, data.outcome, data.referHospital, data.staffId,
    data.staffHelper,
    data.wound, data.deform, data.bleed, data.organ,
    data.medical, data.obgyn, data.peds, data.surgical, data.otherNT,
    data.airway, data.woundCare, data.fluid, data.splint, data.cpr,
    data.initialCare,
    data.deathSignature, data.deathSignerName,
    saveDeathPhotoIfNew_(data.deathPhoto, data.opNo),
    data.nationality, data.nationalityDetail, data.rights,
    JSON.stringify(data.vitalExtra || []),
    data.reportSummarizer, data.evaluatorName,
    data.palliativeCare, data.palliativeSignature, data.palliativeSignerName,
    now, // สร้างเมื่อ(ครั้งแรก) — ตั้งค่าครั้งเดียวตอนสร้างเคสใหม่ ไม่ถูกแก้ไขอีกแม้จะกด "บันทึกการแก้ไข" ในภายหลัง
    data.pupilR
  ];
  sh.appendRow(row);
  updateSummary_();
  updateDashboard_();
  sendLineBroadcast_(buildEMSLineText_(data));
  return { ok: true, sheet: sheetName };
}

function buildEMSLineText_(d) {
  var lines = [];
  lines.push('🚑 เคส EMS ใหม่');
  lines.push('เบอร์ผู้แจ้ง: ' + (d.callerPhone || '-'));
  lines.push('ระดับความรุนแรง: ' + (d.severity || '-') + ' | ประเภท: ' + (d.traumaType || '-'));
  lines.push('เวลารับแจ้ง: ' + (d.tReceived || '-') + ' สั่งการ: ' + (d.tDispatch || '-') +
    ' ออกจากฐาน: ' + (d.tDepartStation || '-') + ' ถึงที่เกิดเหตุ: ' + (d.tArriveScene || '-') +
    ' ออกจากที่เกิดเหตุ: ' + (d.tDepartScene || '-') + ' ถึงรพ: ' + (d.tArriveHospital || '-') +
    ' ถึงฐาน: ' + (d.tArriveStation || '-'));
  lines.push('เลขไมล์: ออก:' + (d.mileOut || '-') + ' ถึงเหตุ:' + (d.mileScene || '-') +
    ' ถึงรพ:' + (d.mileHospital || '-') + ' ถึงฐาน:' + (d.mileStation || '-') +
    ' | รวม: ' + (d.totalKm || '0') + ' km');
  lines.push('ผู้ป่วย: ' + (d.patientName || '-') + ' อายุ ' + (d.age || '-') + ' ปี');
  lines.push('ID: ' + (d.patientId || '-') + ' HN: ' + (d.hn || '-'));
  lines.push('ที่อยู่: ' + (d.address || '-'));
  lines.push('Dx: ' + (d.dx || '-'));
  lines.push('Vital Signs: BP ' + (d.bp || '-') + ' mmHg, PR ' + (d.pr || '-') + ' bpm, RR ' +
    (d.rr || '-') + ' bpm, BT ' + (d.bt || '-') + ' °C, O2sat ' + (d.o2sat || '-') + '%');
  lines.push('GCS: E' + (d.gcsE || '-') + ' V' + (d.gcsV || '-') + ' M' + (d.gcsM || '-') +
    ' = ' + (d.gcsTotal || '0') + ' | Pupil ซ้าย: ' + (d.pupilL || '-') + ' ขวา: ' + (d.pupilR || '-') + ' | DTX: ' + (d.dtx || '-') + ' mg%');
  lines.push('Treatment: ' + (d.treatment || '-'));
  lines.push('ผลการรักษา: ' + (d.outcome || '-'));
  if (d.outcome === 'Refer') {
    lines.push('ส่งต่อ: ' + (d.referHospital || '-'));
  }
  lines.push('ผู้บันทึก: ' + (d.staffId || '-'));
  return lines.join('\n');
}

function sendLineBroadcast_(text) {
  try {
    var token = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');
    if (!token) return; // ยังไม่ได้ตั้งค่า token ข้ามการส่ง LINE ไปเลย
    var url = 'https://api.line.me/v2/bot/message/broadcast';
    var payload = { messages: [{ type: 'text', text: text }] };
    var options = {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    UrlFetchApp.fetch(url, options);
  } catch (e) {
    // ไม่ให้การส่ง LINE ล้มเหลวไปกระทบการบันทึกข้อมูลหลัก
  }
}

function saveRefer(data) {
  var ym = monthKey_(data.date);
  var sheetName = 'REFER_' + ym;
  var sh = getOrCreateSheet_(sheetName, REFER_HEADERS);
  var now = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss');
  var row = [
    now, data.date, data.patientName, data.hn, data.age, data.dx,
    data.referHospital, data.team, data.severity, data.staffId,
    data.traumaType
  ];
  sh.appendRow(row);
  updateSummary_();
  updateDashboard_();
  return { ok: true, sheet: sheetName };
}

// ===== รายการเคส (ดู/แก้ไข/ลบ) สำหรับแสดงใต้ฟอร์ม EMS และ REFER =====

function monthsInRange_(dateFrom, dateTo) {
  var months = [];
  var d = new Date(dateFrom + 'T00:00:00');
  var end = new Date(dateTo + 'T00:00:00');
  if (isNaN(d.getTime()) || isNaN(end.getTime())) return months;
  var guard = 0;
  while (d <= end && guard < 240) {
    var ym = Utilities.formatDate(d, TZ, 'yyyy-MM');
    if (months.indexOf(ym) === -1) months.push(ym);
    d.setMonth(d.getMonth() + 1, 1);
    guard++;
  }
  return months;
}

// คอลัมน์ที่เก็บ "วันที่" ล้วน (ไม่มีเวลา) — ต้อง format แบบ yyyy-MM-dd เท่านั้น
// เพราะ Google Sheets อาจแปลงข้อความวันที่/เวลาที่บันทึกเป็นชนิด Date ให้อัตโนมัติ
var EMS_DATE_COLS_ = [1];
var EMS_TIME_COLS_ = [16, 17, 18, 19, 20, 21, 22];
var EMS_DATETIME_COLS_ = [0, 78];
var REFER_DATE_COLS_ = [1];
var REFER_DATETIME_COLS_ = [0];

function rowsToPlain_(values, dateCols, timeCols, datetimeCols) {
  dateCols = dateCols || [];
  timeCols = timeCols || [];
  datetimeCols = datetimeCols || [];
  return values.map(function (row) {
    return row.map(function (v, i) {
      if (!(v instanceof Date)) return v;
      if (dateCols.indexOf(i) !== -1) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
      if (timeCols.indexOf(i) !== -1) return Utilities.formatDate(v, TZ, 'HH:mm');
      if (datetimeCols.indexOf(i) !== -1) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd HH:mm:ss');
      return Utilities.formatDate(v, TZ, 'yyyy-MM-dd HH:mm:ss');
    });
  });
}

function getEMSList(dateFrom, dateTo) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var months = monthsInRange_(dateFrom, dateTo);
  var out = [];
  months.forEach(function (ym) {
    var sh = ss.getSheetByName('EMS_' + ym);
    if (!sh) return;
    var last = sh.getLastRow();
    if (last < 2) return;
    var values = rowsToPlain_(
      sh.getRange(2, 1, last - 1, EMS_HEADERS.length).getValues(),
      EMS_DATE_COLS_, EMS_TIME_COLS_, EMS_DATETIME_COLS_
    );
    values.forEach(function (row, i) {
      var dateStr = String(row[1]);
      if (dateStr >= dateFrom && dateStr <= dateTo) {
        out.push({ id: 'EMS_' + ym + '!' + (i + 2), row: row });
      }
    });
  });
  // เรียงจากเคสที่บันทึก(สร้าง)ก่อนไปหลัง โดยใช้ "สร้างเมื่อ(ครั้งแรก)" ซึ่งไม่เปลี่ยนแม้แก้ไขข้อมูลภายหลัง
  // (เคสเก่าก่อนมีคอลัมน์นี้ ไม่มีค่า -> ใช้ "บันทึกเมื่อ" แทนเป็นค่าตั้งต้น) เพื่อให้เลขลำดับ 1,2,3... คงที่ตามลำดับสร้างจริงเสมอ
  function createdKey_(r) { return r[78] || r[0]; }
  out.sort(function (a, b) { return createdKey_(a.row) > createdKey_(b.row) ? 1 : -1; });
  return out;
}

function getReferList(dateFrom, dateTo) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var months = monthsInRange_(dateFrom, dateTo);
  var out = [];
  months.forEach(function (ym) {
    var sh = ss.getSheetByName('REFER_' + ym);
    if (!sh) return;
    var last = sh.getLastRow();
    if (last < 2) return;
    var values = rowsToPlain_(
      sh.getRange(2, 1, last - 1, REFER_HEADERS.length).getValues(),
      REFER_DATE_COLS_, [], REFER_DATETIME_COLS_
    );
    values.forEach(function (row, i) {
      var dateStr = String(row[1]);
      if (dateStr >= dateFrom && dateStr <= dateTo) {
        out.push({ id: 'REFER_' + ym + '!' + (i + 2), row: row });
      }
    });
  });
  out.sort(function (a, b) { return a.row[0] < b.row[0] ? 1 : -1; });
  return out;
}

function parseRowId_(id) {
  var idx = id.lastIndexOf('!');
  return { sheetName: id.substring(0, idx), rowNum: parseInt(id.substring(idx + 1), 10) };
}

function updateEMS(id, data) {
  var ref = parseRowId_(id);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(ref.sheetName);
  if (!sh) return { ok: false, message: 'ไม่พบรายการนี้แล้ว (อาจถูกแก้ไข/ลบไปแล้ว) กรุณาโหลดรายการใหม่' };
  var now = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss');
  // อ่านค่า "สร้างเมื่อ(ครั้งแรก)" เดิมจากชีทไว้ก่อน เพื่อคงลำดับเคสเดิมไว้แม้จะแก้ไขข้อมูล
  // (เคสเก่าที่บันทึกไว้ก่อนมีคอลัมน์นี้จะไม่มีค่า ให้ใช้เวลาบันทึกเดิม (คอลัมน์แรก) แทนเป็นค่าตั้งต้น)
  var existingRow = sh.getRange(ref.rowNum, 1, 1, EMS_HEADERS.length).getValues()[0];
  var originalCreatedAt = existingRow[78] || existingRow[0] || now;
  var row = [
    now, data.date, data.shift, data.seq, data.opNo,
    data.staffRN, data.staffAEMT, data.staffDriver,
    data.receivedFrom, data.incidentType, data.incident, data.location, data.callerPhone,
    data.severity, data.traumaType, data.found,
    data.tReceived, data.tDispatch, data.tDepartStation, data.tArriveScene,
    data.tDepartScene, data.tArriveHospital, data.tArriveStation,
    data.mileOut, data.mileScene, data.mileHospital, data.mileStation, data.totalKm,
    data.patientName, data.age, data.patientId, data.hn, data.address, data.symptoms, data.dx,
    data.bp, data.pr, data.rr, data.bt, data.o2sat,
    data.gcsE, data.gcsV, data.gcsM, data.gcsTotal, data.pupilL, data.dtx,
    data.treatment, data.outcome, data.referHospital, data.staffId,
    data.staffHelper,
    data.wound, data.deform, data.bleed, data.organ,
    data.medical, data.obgyn, data.peds, data.surgical, data.otherNT,
    data.airway, data.woundCare, data.fluid, data.splint, data.cpr,
    data.initialCare,
    data.deathSignature, data.deathSignerName,
    saveDeathPhotoIfNew_(data.deathPhoto, data.opNo),
    data.nationality, data.nationalityDetail, data.rights,
    JSON.stringify(data.vitalExtra || []),
    data.reportSummarizer, data.evaluatorName,
    data.palliativeCare, data.palliativeSignature, data.palliativeSignerName,
    originalCreatedAt, // คงค่าเดิมไว้เสมอ ไม่ถูกเขียนทับด้วยเวลาที่แก้ไข
    data.pupilR
  ];
  var targetSheetName = 'EMS_' + monthKey_(data.date);
  if (targetSheetName !== ref.sheetName) {
    sh.deleteRow(ref.rowNum);
    var targetSh = getOrCreateSheet_(targetSheetName, EMS_HEADERS);
    targetSh.appendRow(row);
  } else {
    sh.getRange(ref.rowNum, 1, 1, row.length).setValues([row]);
  }
  updateSummary_();
  updateDashboard_();
  return { ok: true };
}

function updateRefer(id, data) {
  var ref = parseRowId_(id);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(ref.sheetName);
  if (!sh) return { ok: false, message: 'ไม่พบรายการนี้แล้ว (อาจถูกแก้ไข/ลบไปแล้ว) กรุณาโหลดรายการใหม่' };
  var now = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss');
  var row = [
    now, data.date, data.patientName, data.hn, data.age, data.dx,
    data.referHospital, data.team, data.severity, data.staffId,
    data.traumaType
  ];
  var targetSheetName = 'REFER_' + monthKey_(data.date);
  if (targetSheetName !== ref.sheetName) {
    sh.deleteRow(ref.rowNum);
    var targetSh = getOrCreateSheet_(targetSheetName, REFER_HEADERS);
    targetSh.appendRow(row);
  } else {
    sh.getRange(ref.rowNum, 1, 1, row.length).setValues([row]);
  }
  updateSummary_();
  updateDashboard_();
  return { ok: true };
}

function deleteEMS(id) {
  var ref = parseRowId_(id);
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ref.sheetName);
  if (sh && ref.rowNum >= 2 && ref.rowNum <= sh.getLastRow()) sh.deleteRow(ref.rowNum);
  updateSummary_();
  updateDashboard_();
  return { ok: true };
}

function deleteRefer(id) {
  var ref = parseRowId_(id);
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ref.sheetName);
  if (sh && ref.rowNum >= 2 && ref.rowNum <= sh.getLastRow()) sh.deleteRow(ref.rowNum);
  updateSummary_();
  updateDashboard_();
  return { ok: true };
}

function emptyMonth_() {
  return {
    emsCount: 0, severity: {}, traumaType: {}, outcome: {}, totalKm: 0,
    incidentType: {}, found: {},
    referCount: 0, referSeverity: {}
  };
}

function updateSummary_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sumName = 'สรุป';
  var sum = ss.getSheetByName(sumName);
  if (!sum) {
    sum = ss.insertSheet(sumName);
  } else {
    sum.clearContents();
    sum.clearFormats();
  }
  ss.setActiveSheet(sum);
  ss.moveActiveSheet(2);

  sum.getRange(1, 1).setValue('สรุปข้อมูล EMS & REFER รายเดือน (อัปเดตอัตโนมัติทุกครั้งที่บันทึก)')
    .setFontWeight('bold').setFontSize(14);

  var sheets = ss.getSheets();
  var months = {};

  sheets.forEach(function (sh) {
    var name = sh.getName();
    var m;
    if ((m = name.match(/^EMS_(\d{4}-\d{2})$/))) {
      var ym = m[1];
      months[ym] = months[ym] || emptyMonth_();
      var last = sh.getLastRow();
      if (last < 2) return;
      var vals = sh.getRange(2, 1, last - 1, EMS_HEADERS.length).getValues();
      vals.forEach(function (r) {
        var rec = months[ym];
        rec.emsCount++;
        var itype = r[9];
        if (itype) rec.incidentType[itype] = (rec.incidentType[itype] || 0) + 1;
        var sev = r[13];
        if (sev) rec.severity[sev] = (rec.severity[sev] || 0) + 1;
        var tt = r[14];
        if (tt) rec.traumaType[tt] = (rec.traumaType[tt] || 0) + 1;
        var found = r[15];
        if (found) rec.found[found] = (rec.found[found] || 0) + 1;
        var outcome = r[47];
        if (outcome) rec.outcome[outcome] = (rec.outcome[outcome] || 0) + 1;
        var km = parseFloat(r[27]);
        if (!isNaN(km)) rec.totalKm += km;
      });
    } else if ((m = name.match(/^REFER_(\d{4}-\d{2})$/))) {
      var ym2 = m[1];
      months[ym2] = months[ym2] || emptyMonth_();
      var last2 = sh.getLastRow();
      if (last2 < 2) return;
      var vals2 = sh.getRange(2, 1, last2 - 1, REFER_HEADERS.length).getValues();
      vals2.forEach(function (r) {
        var rec = months[ym2];
        rec.referCount++;
        var sev = r[8];
        if (sev) rec.referSeverity[sev] = (rec.referSeverity[sev] || 0) + 1;
      });
    }
  });

  var ymKeys = Object.keys(months).sort();
  var row = 3;
  ymKeys.forEach(function (ym) {
    var rec = months[ym];
    sum.getRange(row, 1).setValue(monthLabelThai_(ym))
      .setFontWeight('bold').setFontSize(12).setBackground('#e8f0fe');
    row++;
    sum.getRange(row, 1, 1, 2).setValues([['หัวข้อ', 'จำนวน']]).setFontWeight('bold');
    row++;
    var lines = [
      ['จำนวนเคส EMS ทั้งหมด', rec.emsCount],
      ['  - สีแดง', rec.severity['สีแดง'] || 0],
      ['  - สีเหลือง', rec.severity['สีเหลือง'] || 0],
      ['  - สีเขียว', rec.severity['สีเขียว'] || 0],
      ['  - สีขาว', rec.severity['สีขาว'] || 0],
      ['  - สีดำ', rec.severity['สีดำ'] || 0],
      ['  - Trauma', rec.traumaType['Trauma'] || 0],
      ['  - Non-Trauma', rec.traumaType['Non-Trauma'] || 0],
      ['  - ประเภท: พรบ', rec.incidentType['พรบ'] || 0],
      ['  - ประเภท: อุบัติเหตุ', rec.incidentType['อุบัติเหตุ'] || 0],
      ['  - ประเภท: ฉุกเฉิน', rec.incidentType['ฉุกเฉิน'] || 0],
      ['  - พบเหตุ', rec.found['พบเหตุ'] || 0],
      ['  - ไม่พบเหตุ', rec.found['ไม่พบเหตุ'] || 0],
      ['  - ไม่ประสงค์ รพ.', rec.found['ไม่ประสงค์ รพ.'] || 0],
      ['  - ผลการรักษา D/C', rec.outcome['D/C'] || 0],
      ['  - ผลการรักษา Admit', rec.outcome['Admit'] || 0],
      ['  - ผลการรักษา Refer', rec.outcome['Refer'] || 0],
      ['  - ผลการรักษา Death', rec.outcome['Death'] || 0],
      ['ระยะทางรวม (กม.)', Math.round(rec.totalKm * 100) / 100],
      ['จำนวนเคส REFER ทั้งหมด', rec.referCount],
      ['  - ระดับวิกฤต (ฉุกเฉินสีแดง)', rec.referSeverity['ระดับวิกฤต (ฉุกเฉินสีแดง)'] || 0],
      ['  - ระดับฉุกเฉิน (ฉุกเฉินสีเหลือง)', rec.referSeverity['ระดับฉุกเฉิน (ฉุกเฉินสีเหลือง)'] || 0],
      ['  - ระดับเร่งด่วน (ฉุกเฉินสีเขียว)', rec.referSeverity['ระดับเร่งด่วน (ฉุกเฉินสีเขียว)'] || 0],
      ['  - ระดับไม่เร่งด่วน (ปกติ)', rec.referSeverity['ระดับไม่เร่งด่วน (ปกติ)'] || 0]
    ];
    sum.getRange(row, 1, lines.length, 2).setValues(lines);
    row += lines.length + 1;
  });

  sum.setColumnWidth(1, 280);
  sum.setColumnWidth(2, 100);
}

/**
 * แดชบอร์ดสด — อัปเดตอัตโนมัติทุกครั้งที่มีการบันทึก EMS หรือ REFER
 * แสดงตัวเลขวันนี้/เดือนนี้ + เคสล่าสุด + กราฟจำนวนเคสรายวัน
 */
function updateDashboard_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var name = 'แดชบอร์ด';
  var dash = ss.getSheetByName(name);
  if (!dash) {
    dash = ss.insertSheet(name, 0);
  } else {
    dash.getCharts().forEach(function (c) { dash.removeChart(c); });
    dash.clearContents();
    dash.clearFormats();
  }
  ss.setActiveSheet(dash);
  ss.moveActiveSheet(1);

  var now = new Date();
  var todayStr = Utilities.formatDate(now, TZ, 'yyyy-MM-dd');
  var ymNow = Utilities.formatDate(now, TZ, 'yyyy-MM');
  var updatedStr = Utilities.formatDate(now, TZ, 'dd/MM/yyyy HH:mm:ss');

  dash.getRange(1, 1, 1, 7).merge();
  dash.getRange(1, 1).setValue('🚑  แดชบอร์ด NKT Rescue — สด')
    .setFontSize(18).setFontWeight('bold').setFontColor('#ffffff');
  dash.getRange(1, 1, 1, 7).setBackground('#0a2e4d');
  dash.setRowHeight(1, 42);

  dash.getRange(2, 1, 1, 7).merge();
  dash.getRange(2, 1).setValue('อัปเดตล่าสุด: ' + updatedStr + '   |   เดือน: ' + monthLabelThai_(ymNow))
    .setFontSize(10).setFontColor('#5f6b66').setFontStyle('italic');

  var emsSheet = ss.getSheetByName('EMS_' + ymNow);
  var emsRows = [];
  if (emsSheet && emsSheet.getLastRow() > 1) {
    emsRows = emsSheet.getRange(2, 1, emsSheet.getLastRow() - 1, EMS_HEADERS.length).getValues();
  }
  var referSheet = ss.getSheetByName('REFER_' + ymNow);
  var referCountMonth = (referSheet && referSheet.getLastRow() > 1) ? referSheet.getLastRow() - 1 : 0;

  var todayCount = 0;
  var sevCount = { 'สีแดง': 0, 'สีเหลือง': 0, 'สีเขียว': 0, 'สีขาว': 0, 'สีดำ': 0 };
  var totalKm = 0;
  var byDay = {};

  emsRows.forEach(function (r) {
    var d = r[1];
    var dateStr = (d instanceof Date) ? Utilities.formatDate(d, TZ, 'yyyy-MM-dd') : String(d);
    if (dateStr === todayStr) todayCount++;
    byDay[dateStr] = (byDay[dateStr] || 0) + 1;
    var sev = r[13];
    if (sevCount.hasOwnProperty(sev)) sevCount[sev]++;
    var km = parseFloat(r[27]);
    if (!isNaN(km)) totalKm += km;
  });

  var tiles = [
    { label: 'เคส EMS วันนี้', value: todayCount, bg: '#146aa8' },
    { label: 'เคส EMS เดือนนี้', value: emsRows.length, bg: '#0a2e4d' },
    { label: 'REFER เดือนนี้', value: referCountMonth, bg: '#5c9a1e' },
    { label: 'สีแดง (วิกฤต)', value: sevCount['สีแดง'], bg: '#c62828' },
    { label: 'สีเหลือง (ฉุกเฉิน)', value: sevCount['สีเหลือง'], bg: '#f9a825' },
    { label: 'ระยะทางรวม (กม.)', value: Math.round(totalKm * 10) / 10, bg: '#546e7a' }
  ];

  var col = 1;
  tiles.forEach(function (t) {
    dash.getRange(4, col).setValue(t.value)
      .setFontSize(24).setFontWeight('bold').setFontColor('#ffffff')
      .setBackground(t.bg).setHorizontalAlignment('center');
    dash.getRange(5, col).setValue(t.label)
      .setFontSize(10).setFontColor('#ffffff').setBackground(t.bg)
      .setHorizontalAlignment('center').setWrap(true);
    dash.setColumnWidth(col, 130);
    col++;
  });
  dash.setRowHeight(4, 48);
  dash.setRowHeight(5, 36);

  var feedRow = 7;
  dash.getRange(feedRow, 1, 1, 7).merge();
  dash.getRange(feedRow, 1).setValue('เคสล่าสุด (เดือนนี้)')
    .setFontWeight('bold').setFontSize(13).setFontColor('#0a2e4d');
  feedRow++;

  var feedHeader = ['บันทึกเมื่อ', 'วันที่', 'ชื่อผู้ป่วย', 'ระดับ', 'ประเภท', 'ผลการรักษา', 'ผู้บันทึก'];
  dash.getRange(feedRow, 1, 1, feedHeader.length).setValues([feedHeader])
    .setFontWeight('bold').setBackground('#eef1ea');
  feedRow++;

  var recent = emsRows.slice(-8).reverse();
  if (recent.length > 0) {
    var feedRows = recent.map(function (r) {
      return [r[0], r[1], r[28], r[13], r[14], r[47], r[48]];
    });
    dash.getRange(feedRow, 1, feedRows.length, feedHeader.length).setValues(feedRows);
    feedRow += feedRows.length;
  } else {
    dash.getRange(feedRow, 1).setValue('ยังไม่มีเคส EMS ในเดือนนี้').setFontColor('#5f6b66').setFontStyle('italic');
    feedRow += 1;
  }

  dash.autoResizeColumns(1, 7);

  var chartAnchorRow = feedRow + 2;
  var dayKeys = Object.keys(byDay).sort();
  if (dayKeys.length > 0) {
    dash.getRange(chartAnchorRow, 1).setValue('วันที่');
    dash.getRange(chartAnchorRow, 2).setValue('จำนวนเคส');
    dayKeys.forEach(function (d, i) {
      dash.getRange(chartAnchorRow + 1 + i, 1).setValue(d);
      dash.getRange(chartAnchorRow + 1 + i, 2).setValue(byDay[d]);
    });
    var dataRange = dash.getRange(chartAnchorRow, 1, dayKeys.length + 1, 2);
    var chart = dash.newChart()
      .setChartType(Charts.ChartType.COLUMN)
      .addRange(dataRange)
      .setPosition(chartAnchorRow, 4, 0, 0)
      .setOption('title', 'จำนวนเคส EMS รายวัน (เดือนนี้)')
      .setOption('legend', { position: 'none' })
      .setOption('colors', ['#146aa8'])
      .setOption('width', 480)
      .setOption('height', 260)
      .build();
    dash.insertChart(chart);
  }
}

function resetDashboard() {
  updateSummary_();
  updateDashboard_();
}

// ทำงานอัตโนมัติทุกครั้งที่มีการแก้ไขข้อมูลในชีตด้วยมือ (พิมพ์/ลบ/แก้ไขเซลล์)
// เพื่อให้หน้า "สรุป" และ "แดชบอร์ด" อัปเดตตามโดยไม่ต้องรัน resetDashboard เอง
function onEdit(e) {
  try {
    if (!e || !e.source) return;
    var sheetName = e.source.getActiveSheet().getName();
    // ข้ามการอัปเดตถ้าแก้ไขในชีตที่สร้างขึ้นเองอยู่แล้ว (กันงานซ้ำ/ลูป)
    if (sheetName === 'สรุป' || sheetName === 'แดชบอร์ด' || sheetName === 'บันทึกเข้าระบบ') return;
    // ทำงานเฉพาะชีตข้อมูล EMS_*/REFER_* เท่านั้น
    if (!/^(EMS_|REFER_)\d{4}-\d{2}$/.test(sheetName)) return;
    updateSummary_();
    updateDashboard_();
  } catch (err) {
    // ไม่ให้ error จาก trigger ไปรบกวนการแก้ไขปกติของผู้ใช้
  }
}

// ===== แบบบันทึก ALS (PDF/พิมพ์ได้) =====

function getRowById_(id, headers) {
  var ref = parseRowId_(id);
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ref.sheetName);
  if (!sh || ref.rowNum < 2 || ref.rowNum > sh.getLastRow()) return null;
  return sh.getRange(ref.rowNum, 1, 1, headers.length).getValues()[0];
}

function htmlEscape_(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatTimeVal_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'HH:mm');
  return v == null ? '' : String(v);
}

function formatThaiDate_(v) {
  if (v instanceof Date) {
    var s = Utilities.formatDate(v, TZ, 'dd/MM/yyyy');
    var p = s.split('/');
    return p[0] + '/' + p[1] + '/' + (parseInt(p[2], 10) + 543);
  }
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || ''));
  if (!m) return String(v || '');
  return m[3] + '/' + m[2] + '/' + (parseInt(m[1], 10) + 543);
}

// เดาเพศจากคำนำหน้าชื่อที่พิมพ์ในช่อง "ชื่อผู้ป่วย" — คืนค่า {male, female}
function guessSex_(name) {
  var s = String(name || '').trim();
  if (/^(นาง(สาว)?|เด็กหญิง|ด\.ญ\.?|น\.ส\.?)/.test(s)) return { male: false, female: true };
  if (/^(นาย|เด็กชาย|ด\.ช\.?)/.test(s)) return { male: true, female: false };
  return { male: false, female: false };
}

function buildALSFormHtml_(id, rowOverride) {
  var row = rowOverride || getRowById_(id, EMS_HEADERS);
  if (!row) {
    return '<html><body style="font-family:sans-serif;padding:40px;text-align:center;">' +
      '<h2>ไม่พบข้อมูลเคสนี้</h2><p>อาจถูกลบหรือแก้ไขไปแล้ว</p></body></html>';
  }
  var d = {
    date: row[1], shift: row[2], seq: row[3], opNo: row[4],
    rn: row[5], aemt: row[6], driver: row[7],
    receivedFrom: row[8], incidentType: row[9], incident: row[10], location: row[11], callerPhone: row[12],
    severity: row[13], traumaType: row[14], found: row[15],
    tReceived: row[16], tDispatch: row[17], tDepartStation: row[18], tArriveScene: row[19],
    tDepartScene: row[20], tArriveHospital: row[21], tArriveStation: row[22],
    mileOut: row[23], mileScene: row[24], mileHospital: row[25], mileStation: row[26], totalKm: row[27],
    patientName: row[28], age: row[29], patientId: row[30], hn: row[31], address: row[32],
    symptoms: row[33], dx: row[34],
    bp: row[35], pr: row[36], rr: row[37], bt: row[38], o2sat: row[39],
    gcsE: row[40], gcsV: row[41], gcsM: row[42], gcsTotal: row[43], pupil: row[44], dtx: row[45],
    treatment: row[46], outcome: row[47], referHospital: row[48], staffId: row[49],
    helper: row[50],
    wound: row[51], deform: row[52], bleed: row[53], organ: row[54],
    medical: row[55], obgyn: row[56], peds: row[57], surgical: row[58], otherNT: row[59],
    airway: row[60], woundCare: row[61], fluid: row[62], splint: row[63], cpr: row[64],
    initialCare: row[65],
    deathSignature: row[66], deathSignerName: row[67], deathPhoto: row[68],
    nationality: row[69], nationalityDetail: row[70], rights: row[71],
    vitalExtra: row[72],
    reportSummarizer: row[73], evaluatorName: row[74],
    palliativeCare: row[75], palliativeSignature: row[76], palliativeSignerName: row[77],
    pupilR: row[79]
  };

  function e(v) { return htmlEscape_(v); }
  function t(v) { return e(formatTimeVal_(v)); }
  function num(v) { var n = parseFloat(v); return isNaN(n) ? null : n; }
  function km(a, b) {
    var na = num(a), nb = num(b);
    if (na === null || nb === null) return '';
    return String(Math.round((nb - na) * 100) / 100);
  }
  function cb(checked) { return checked ? '&#9745;' : '&#9744;'; }
  function parseHM_(v) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(v || '').trim());
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }
  function minDiff_(from, to) {
    var m1 = parseHM_(from), m2 = parseHM_(to);
    if (m1 === null || m2 === null) return '';
    var diff = m2 - m1;
    if (diff < 0) diff += 24 * 60; // ข้ามเที่ยงคืน
    return String(diff);
  }
  // เส้นประ (บรรทัดให้กรอก) — ถ้ามีค่าจากระบบจะโชว์ค่านั้นขีดเส้นใต้, ถ้าไม่มีจะเป็นช่องว่างให้กรอกมือ
  function ln(v, minWidth) {
    var w = minWidth || 60;
    return '<span class="line" style="min-width:' + w + 'px;">' + (v ? e(v) : '') + '</span>';
  }

  var dateThai = formatThaiDate_(d.date);
  var kmToScene = km(d.mileOut, d.mileScene);
  var kmToHosp = km(d.mileScene, d.mileHospital);
  // ระยะทางกลับ = เลขกม. "ออกจากที่เกิดเหตุ" (เท่ากับเลขกม. ถึงที่เกิดเหตุ) ลบกับ "ถึง รพ."
  var kmBack = km(d.mileScene, d.mileHospital);
  // เดาเพศจากคำนำหน้าชื่อที่พิมพ์ (นาง/นางสาว/เด็กหญิง = หญิง, นาย/เด็กชาย = ชาย)
  var sexChk = guessSex_(d.patientName);

  var html = '';
  html += '<!doctype html><html><head><meta charset="utf-8">';
  html += '<title>แบบบันทึก ALS - ' + e(d.patientName) + '</title>';
  html += '<style>';
  html += '@page{ size:A4 portrait; margin:4mm; }';
  html += '*{box-sizing:border-box;}';
  html += 'html, body{height:100%;}';
  html += 'body{font-family:"Sarabun","TH Sarabun New",sans-serif; font-size:10.2px; color:#000; margin:0; padding:4px; line-height:1.18; display:flex; flex-direction:column; min-height:calc(297mm - 8mm);}';
  html += 'h1{font-size:14px; text-align:center; margin:0 0 3.2px; font-weight:700; flex-shrink:0;}';
  html += '.no-print{flex-shrink:0;}';
  html += '.frame{border:1.5px solid #000; flex:1; display:flex; flex-direction:column; justify-content:space-between; position:relative;}';
  html += '.not-found-stamp{position:absolute; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-28deg); font-size:150px; font-weight:900; letter-spacing:10px; color:rgba(200,0,0,0.45); border:10px solid rgba(200,0,0,0.45); padding:10px 26px; z-index:999; pointer-events:none; white-space:nowrap; line-height:1;}';
  html += '.sec{border-top:1.5px solid #000; padding:2.4px 9px;}';
  html += '.sec:first-child{border-top:none;}';
  html += '.sec-title{font-weight:700; margin-bottom:1.6px;}';
  html += '.row{display:flex; flex-wrap:wrap; align-items:baseline; gap:1.6px 14.5px; margin:1.6px 0;}';
  html += '.fld{white-space:nowrap;}';
  html += '.line{display:inline-block; border-bottom:1px dotted #000; min-width:60px; padding:0 3px; font-weight:600;}';
  html += 'table.grid{border-collapse:collapse; width:100%; margin:2.8px 0;}';
  html += 'table.grid th, table.grid td{border:1px solid #000; padding:1.5px 3.5px; font-size:9.7px; text-align:center;}';
  html += 'table.grid th{font-weight:700; background:#f2f2f2;}';
  html += '.chklist{display:flex; flex-wrap:wrap; gap:1.6px 12px; margin:1px 0;}';
  html += '.chk{white-space:nowrap;}';
  html += '.sub{font-size:9.6px; color:#333; padding-left:4px;}';
  html += '.subrow{display:flex; gap:7.3px; margin:0.4px 0;}';
  html += '.subrow .lbl{min-width:150px; font-weight:600;}';
  html += '.print-btn{margin:8px 0; padding:10px 18px; font-size:14px; cursor:pointer;}';
  html += '.footnote{font-size:9px; color:#555; margin-top:2.5px; border-top:1px dashed #999; padding-top:1.3px;}';
  html += '.sysnote{font-size:9px; color:#0a6; margin-top:1.5px;}';
  html += '.grp{display:flex; border:1px solid #000; margin:1.2px 0;}';
  html += '.grp-label{writing-mode:vertical-rl; text-orientation:mixed; transform:rotate(180deg); font-weight:700; font-size:9px; text-align:center; padding:2.5px 1px; border-right:1px solid #000; background:#f2f2f2; display:flex; align-items:center; justify-content:center; white-space:nowrap; flex-shrink:0;}';
  html += '.grp-body{flex:1; padding:1px 6px; min-width:0;}';
  html += '.grp-body .subrow{margin:0.6px 0;}';
  html += '.box-table{border:1px solid #000;}';
  html += '.box-row{display:flex; flex-wrap:wrap; align-items:baseline; gap:1.6px 14.5px; padding:1.5px 6px; border-bottom:1px solid #000;}';
  html += '.box-row:last-child{border-bottom:none;}';
  html += '.hatch{background-image:repeating-linear-gradient(45deg, #ccc, #ccc 2px, #fff 2px, #fff 6px);}';
  html += '.big-zone{font-size:1.04em;}';
  html += '.big-zone table.grid th, .big-zone table.grid td{font-size:1.02em;}';
  html += '.big-zone .line{font-weight:700;}';
  html += '@media print{ .no-print{display:none;} }';
  html += '</style></head><body>';

  html += '<div class="no-print" style="text-align:center;">' +
    '<button class="print-btn" onclick="window.print()">🖨️ พิมพ์ / บันทึกเป็น PDF</button></div>';

  html += '<h1>แบบบันทึกการปฏิบัติงานบริการการแพทย์ฉุกเฉินระดับสูง (ALS)</h1>';

  html += '<div class="frame">';
  if (d.found === 'ไม่พบเหตุ') {
    html += '<div class="not-found-stamp">ไม่พบเหตุ</div>';
  }
  html += '<div class="big-zone">'; // ขยายตัวหนังสือเฉพาะข้อ 1, 2 และต้นข้อ 3 (ถึงบรรทัด "ประเภทเหตุการณ์")

  // ===== 1. หน่วยบริการ =====
  html += '<div class="sec">';
  html += '<div class="row" style="margin-bottom:2px;">';
  html += '<span class="sec-title" style="margin:0;">1. หน่วยบริการ</span>';
  html += '<span class="fld">ลำดับผู้ป่วย (CN) ' + ln(d.seq, 60) + '</span>';
  html += '<span class="fld">เลขที่ผู้ป่วย ' + ln(d.opNo, 100) + '</span>';
  html += '</div>';
  html += '<div class="box-table">';
  html += '<div class="box-row">';
  html += '<span class="fld">ชื่อหน่วยบริการ ' + ln('ER รพ.นครไทย', 160) + '</span>';
  html += '<span class="fld">วันที่ ' + ln(dateThai, 90) + '</span>';
  html += '<span class="fld">ปฏิบัติการที่ ' + ln(d.opNo, 90) + '</span>';
  html += '</div>';
  html += '<div class="box-row">';
  html += '<span class="fld">เจ้าหน้าที่ผู้ให้บริการ&nbsp; 1. ' + ln(withStaffRole_(d.rn), 150) + ' รหัส ' + ln('', 60) + '</span>';
  html += '<span class="fld">2. ' + ln(withStaffRole_(d.aemt), 150) + ' รหัส ' + ln('', 60) + '</span>';
  html += '</div>';
  html += '<div class="box-row">';
  html += '<span class="fld">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 3. ' + ln(d.driver ? d.driver + ' (พขร.)' : '', 150) + ' รหัส ' + ln('', 60) + '</span>';
  html += '<span class="fld">4. ' + ln(d.helper ? d.helper + ' (ผู้ช่วยเหลือ)' : '', 150) + ' รหัส ' + ln('', 60) + '</span>';
  html += '</div>';
  html += '<div class="box-row">';
  html += '<span class="fld">ผลการปฏิบัติงาน</span>';
  html += '<span class="chk">' + cb(d.found === 'ไม่พบเหตุ') + ' ไม่พบเหตุ</span>';
  html += '<span class="chk">' + cb(d.found === 'พบเหตุ') + ' พบเหตุ สถานที่เกิดเหตุ ' + ln(d.location, 260) + '</span>';
  html += '</div>';
  html += '</div>'; // .box-table
  html += '</div>';

  // ===== 2. ข้อมูลเวลา =====
  html += '<div class="sec"><div class="sec-title">2. ข้อมูลเวลา</div>';
  html += '<table class="grid"><tr><th></th><th>รับแจ้ง</th><th>สั่งการ</th><th>ออกจากฐาน</th><th>ถึงที่เกิดเหตุ</th><th>ออกจากที่เกิดเหตุ</th><th>ถึง รพ.</th><th>ถึงฐาน</th></tr>';
  html += '<tr><td>เวลา (น.)</td><td>' + t(d.tReceived) + '</td><td>' + t(d.tDispatch) + '</td><td>' + t(d.tDepartStation) +
    '</td><td>' + t(d.tArriveScene) + '</td><td>' + t(d.tDepartScene) + '</td><td>' + t(d.tArriveHospital) +
    '</td><td>' + t(d.tArriveStation) + '</td></tr>';
  var responseTime = minDiff_(d.tReceived, d.tArriveScene);
  var hospitalTime = minDiff_(d.tDepartScene, d.tArriveHospital);
  html += '<tr><td>รวมเวลา (นาที)</td>' +
    '<td colspan="4">Response time = ' + e(responseTime) + ' นาที)</td>' +
    '<td colspan="2">Hospital Time = ' + e(hospitalTime) + ' นาที</td>' +
    '<td class="hatch"></td></tr>';
  html += '<tr><td>เลข กม.</td><td>-</td><td>-</td><td>' + e(d.mileOut) + '</td><td>' + e(d.mileScene) + '</td><td>' + e(d.mileScene) + '</td><td>' + e(d.mileHospital) + '</td><td>' + e(d.mileStation) + '</td></tr>';
  html += '<tr><td rowspan="2">ระยะทาง (กม.)</td>' +
    '<td colspan="4" rowspan="2">รวมระยะทางไป ' + e(kmToScene) + ' กม.</td>' +
    '<td colspan="2">ระยะทางกลับ ' + e(kmBack) + ' กม.</td>' +
    '<td class="hatch"></td></tr>';
  html += '<tr><td colspan="2">ระยะไป รพ. ' + e(kmToHosp) + ' กม.</td><td class="hatch"></td></tr>';
  html += '</table>';
  html += '</div>';

  // ===== 3. ข้อมูลผู้ป่วย =====
  html += '<div class="sec"><div class="sec-title">3. ข้อมูลผู้ป่วย</div>';
  html += '<div class="row">';
  html += '<span class="fld">คำนำหน้า/ชื่อ-สกุลผู้ป่วย ' + ln(d.patientName, 200) + '</span>';
  html += '<span class="fld">อายุ ' + ln(d.age, 40) + ' ปี</span>';
  html += '<span class="fld">เพศ ' + cb(sexChk.male) + ' ชาย ' + cb(sexChk.female) + ' หญิง</span>';
  html += '<span class="fld">ประกันอื่นๆ (ถ้ามี) ' + cb(false) + ' ประกันท่องเที่ยว ประเภท ' + ln('', 70) + ' &nbsp; ' + cb(false) + ' ผู้ประสบภัยจากรถ</span>';
  html += '</div>';
  // สัญชาติ: ติ๊ก "คนไทย" อัตโนมัติเมื่อกรอกเลขบัตร ID (ถ้าไม่ได้เลือกสัญชาติอื่นไว้)
  var isThai = d.nationality === 'คนไทย' || (!d.nationality && d.patientId);
  var isMigrant = d.nationality === 'แรงงานต่างด้าว';
  var isForeign = d.nationality === 'ชาวต่างชาติ';
  html += '<div class="row">';
  html += '<span class="fld">' + cb(isThai) + ' คนไทย เลขบัตรประชาชน/ID ' + ln(d.patientId, 150) + '</span>';
  html += '<span class="fld">' + cb(isMigrant) + ' แรงงานต่างด้าว ประเภท ' + ln(isMigrant ? d.nationalityDetail : '', 90) + '</span>';
  html += '<span class="fld">' + cb(isForeign) + ' ชาวต่างชาติ ประเทศ ' + ln(isForeign ? d.nationalityDetail : '', 90) + ' เลขที่หนังสือเดินทาง ' + ln('', 100) + '</span>';
  html += '</div>';
  html += '<div class="row">';
  html += '<span class="fld">สิทธิการรักษา ' + cb(d.rights === 'บัตรทอง') + ' บัตรทอง ' + cb(d.rights === 'ข้าราชการ') + ' ข้าราชการ ' + cb(d.rights === 'ประกันสังคม') + ' ประกันสังคม ' +
    cb(d.rights === 'แรงงานต่างด้าวขึ้นทะเบียน') + ' แรงงานต่างด้าวขึ้นทะเบียน ' + cb(d.rights === 'ไม่มีหลักประกัน') + ' ไม่มีหลักประกัน</span>';
  html += '<span class="fld">ประเภท ' + ln('', 60) + ' ทะเบียนรถหมวด ' + ln('', 60) + ' เลขทะเบียน ' + ln('', 60) + ' จังหวัด ' + ln('', 70) + '</span>';
  html += '</div>';
  html += '<div class="row">';
  html += '<span class="fld">HN ' + ln(d.hn, 100) + '</span>';
  html += '<span class="fld">ที่อยู่ ' + ln(d.address, 260) + '</span>';
  html += '</div>';
  html += '<div class="row">';
  html += '<span class="fld">Dx ' + ln(d.dx, 400) + '</span>';
  html += '</div>';

  // แถวสัญญาณชีพชุดแรก (จากระบบ) + ชุดที่เพิ่มเติมทีหลัง (ผู้ใช้กดปุ่ม "เพิ่ม Vital Signs" ซ้ำได้)
  // Pupil แยกซ้าย (pupilL) และขวา (pupilR) — คอลัมน์ "Rt" = pupilR, "Lt" = pupilL
  function vsRow(time, bt, bp, pr, rr, gE, gV, gM, pupilL, pupilR, o2, dtx) {
    return '<tr><td>' + t(time) + '</td><td>' + e(bt) + '</td><td>' + e(bp) + '</td><td>' + e(pr) +
      '</td><td>' + e(rr) + '</td><td>' + e(gE) + '</td><td>' + e(gV) + '</td><td>' + e(gM) +
      '</td><td>' + e(pupilR) + '</td><td>Y/N</td><td>' + e(pupilL) + '</td><td>Y/N</td><td>' + e(o2) + '</td><td>' + e(dtx) + '</td></tr>';
  }
  function vsBlankRow() {
    return '<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>Y/N</td><td>&nbsp;</td><td>Y/N</td><td>&nbsp;</td><td>&nbsp;</td></tr>';
  }
  var vitalExtraList = [];
  try { vitalExtraList = JSON.parse(d.vitalExtra || '[]') || []; } catch (e0) { vitalExtraList = []; }
  html += '<table class="grid"><tr><th rowspan="2">Time</th><th colspan="4">Vital Signs</th><th colspan="3">Neuro Signs</th><th colspan="4">Pupils</th><th rowspan="2">O2 Sat</th><th rowspan="2">DTX</th></tr>';
  html += '<tr><th>T</th><th>BP</th><th>PR</th><th>RR</th><th>E</th><th>V</th><th>M</th><th>Rt</th><th>RTL</th><th>Lt</th><th>RTL</th></tr>';
  html += vsRow(d.tArriveScene, d.bt, d.bp, d.pr, d.rr, d.gcsE, d.gcsV, d.gcsM, d.pupil, d.pupilR, d.o2sat, d.dtx);
  vitalExtraList.forEach(function (vs) {
    html += vsRow(vs.time, vs.bt, vs.bp, vs.pr, vs.rr, vs.gcsE, vs.gcsV, vs.gcsM, vs.pupilL, vs.pupilR, vs.o2sat, vs.dtx);
  });
  var blankRowsNeeded = Math.max(0, 2 - vitalExtraList.length);
  for (var vi = 0; vi < blankRowsNeeded; vi++) { html += vsBlankRow(); }
  html += '</table>';

  // ชุดข้อมูลที่เลือกจากฟอร์ม (comma-separated) แปลงเป็น set ไว้เช็ค checkbox
  function inList(csv, item) {
    var arr = String(csv || '').split(',').map(function (s) { return s.trim(); });
    return arr.indexOf(item) !== -1;
  }
  function chkItem(csv, item) { return cb(inList(csv, item)) + ' ' + item; }

  html += '<div class="subrow"><span class="lbl">ประเภทเหตุการณ์</span><span>' + e(d.traumaType) + (d.incident ? ' — ' + e(d.incident) : '') + '</span></div>';
  html += '</div>'; // .big-zone

  html += '<div class="grp"><div class="grp-label">Trauma</div><div class="grp-body">';
  html += '<div class="subrow"><span class="lbl">บาดแผล</span><span>' +
    ['No', 'Cut/Laceration', 'Abrasion', 'Contusion', 'Burn', 'Stab Wound', 'Amputate', 'GSW'].map(function (i) { return chkItem(d.wound, i); }).join(' &nbsp; ') +
    '</span></div>';
  html += '<div class="subrow"><span class="lbl">กระดูกผิดรูป</span><span>' +
    ['No', 'Closed', 'Opened', 'Dislocate'].map(function (i) { return chkItem(d.deform, i); }).join(' &nbsp; ') +
    '</span></div>';
  html += '<div class="subrow"><span class="lbl">การเสียเลือด</span><span>' +
    ['No', 'Ext/Stopped', 'Ext/Active', 'Int. Hemorrhage'].map(function (i) { return chkItem(d.bleed, i); }).join(' &nbsp; ') +
    '</span></div>';
  html += '<div class="subrow"><span class="lbl">อวัยวะ</span><span>' +
    ['Head/neck', 'Face', 'Spine/back', 'Chest/Clavicle', 'Abdomen', 'Pelvis', 'Extremities', 'External body surface', 'Multiple injury'].map(function (i) { return chkItem(d.organ, i); }).join(' &nbsp; ') +
    '</span></div>';
  html += '</div></div>';

  html += '<div class="grp"><div class="grp-label">Non trauma</div><div class="grp-body">';
  html += '<div class="subrow"><span class="lbl">อายุรกรรม</span><span>' +
    ['Dyspnea', 'High Fever', 'Alteration of conscious', 'Seizure', 'Chest pain', 'Poisoning', 'Digestive', 'Other'].map(function (i) { return chkItem(d.medical, i); }).join(' &nbsp; ') +
    '</span></div>';
  html += '<div class="subrow"><span class="lbl">สูติ-นรีเวช</span><span>' +
    ['Labour pain/child birth', 'Bleeding per Vagina', 'High risk preg', 'Rape', 'Other'].map(function (i) { return chkItem(d.obgyn, i); }).join(' &nbsp; ') +
    '</span></div>';
  html += '<div class="subrow"><span class="lbl">กุมาร</span><span>' +
    ['Convulsion', 'High Fever', 'Dyspnea', 'Digestive', 'Other'].map(function (i) { return chkItem(d.peds, i); }).join(' &nbsp; ') +
    '</span></div>';
  html += '<div class="subrow"><span class="lbl">ศัลยกรรม</span><span>' +
    ['Ac. abdominal pain', 'GI Bleeding', 'Other'].map(function (i) { return chkItem(d.surgical, i); }).join(' &nbsp; ') +
    '</span></div>';
  html += '<div class="subrow"><span class="lbl">อื่นๆ</span><span>' +
    ['Eye', 'ENT', 'Ortho', 'Psychological problem'].map(function (i) { return chkItem(d.otherNT, i); }).join(' &nbsp; ') +
    '</span></div>';
  html += '</div></div>';

  html += '<div class="grp"><div class="grp-label">Treatment</div><div class="grp-body">';
  html += '<div class="subrow"><span class="lbl">ทางเดินหายใจ/การหายใจ</span><span>' +
    ['No', 'Clear airway', 'Suction', 'Oral airway', 'O2 canula/mask', 'Ambu bag', 'ET'].map(function (i) { return chkItem(d.airway, i); }).join(' &nbsp; ') +
    '</span></div>';
  html += '<div class="subrow"><span class="lbl">บาดแผล/ห้ามเลือด</span><span>' +
    ['No', 'Pressure Dressing', 'Dressing'].map(function (i) { return chkItem(d.woundCare, i); }).join(' &nbsp; ') +
    '</span></div>';
  html += '<div class="subrow"><span class="lbl">การให้สารน้ำ</span><span>' +
    ['No', 'NSS', 'RLS', '5%DN/2', 'On locked', 'Others'].map(function (i) { return chkItem(d.fluid, i); }).join(' &nbsp; ') +
    '</span></div>';
  html += '<div class="subrow"><span class="lbl">การดามกระดูก</span><span>' +
    ['No', 'เฝือกลม/ไม้ดาม/Sling', 'Collar with Long Spinal Board', 'เฝือกหลังและคอ (KED)'].map(function (i) { return chkItem(d.splint, i); }).join(' &nbsp; ') +
    '</span></div>';
  html += '<div class="subrow"><span class="lbl">การทำ CPR</span><span>' +
    ['No', 'Yes', 'AED/Defib'].map(function (i) { return chkItem(d.cpr, i); }).join(' &nbsp; ') +
    '</span></div>';
  html += '</div></div>';

  html += '<div class="row"><span class="fld">ยา (วิธีใช้ และขนาด ให้ทาง) ' + ln(d.treatment, 500) + '</span></div>';

  html += '<div class="row"><span class="fld">ผลการดูแลรักษาขั้นต้น ' + e(d.outcome ? '(ผลการรักษาระบบ: ' + d.outcome + ')' : '') + '</span></div>';
  html += '<div class="chklist">' +
    ['ไม่ยอมให้รักษา', 'ทุเลา', 'คงเดิม/คงที่', 'ทรุดหนัก', 'เสียชีวิต ณ จุดเกิดเหตุ', 'เสียชีวิตขณะนำส่ง'].map(function (i) { return chkItem(d.initialCare, i); }).join(' &nbsp; ') +
    '</div>';

  if (d.initialCare === 'เสียชีวิต ณ จุดเกิดเหตุ') {
    html += '<div class="subrow" style="align-items:flex-end;">';
    html += '<span class="lbl">ลายเซ็นญาติรับทราบ</span>';
    if (d.deathSignature) {
      html += '<img src="' + d.deathSignature + '" style="height:28px; border-bottom:1px dotted #000;">';
    } else {
      html += '<span class="line" style="min-width:180px; height:16px;">&nbsp;</span>';
    }
    html += '<span style="margin-left:14px;">ชื่อญาติ ' + ln(d.deathSignerName, 180) + '</span>';
    html += '</div>';
  }

  html += '<div class="row"><span class="chk">' + cb(d.palliativeCare === 'ใช่') + ' รักษาประคับประครองตามอาการ (Palliative/Comfort Care)</span></div>';
  if (d.palliativeCare === 'ใช่') {
    html += '<div class="subrow" style="align-items:flex-end;">';
    html += '<span class="lbl">ลายเซ็นญาติรับทราบ</span>';
    if (d.palliativeSignature) {
      html += '<img src="' + d.palliativeSignature + '" style="height:28px; border-bottom:1px dotted #000;">';
    } else {
      html += '<span class="line" style="min-width:180px; height:16px;">&nbsp;</span>';
    }
    html += '<span style="margin-left:14px;">ชื่อญาติ ' + ln(d.palliativeSignerName, 180) + '</span>';
    html += '</div>';
  }

  // หากติ๊ก "เสียชีวิต ณ จุดเกิดเหตุ" ให้บังคับติ๊กระดับการคัดแยกเป็น "สีดำ" เท่านั้น พร้อมข้อความกำกับ
  var isDeathAtScene = d.initialCare === 'เสียชีวิต ณ จุดเกิดเหตุ';
  html += '<div class="row"><span class="fld">ระดับการคัดแยก (RC Code)</span></div>';
  html += '<div class="chklist">';
  html += cb(!isDeathAtScene && d.severity === 'สีแดง') + ' แดง (วิกฤต) &nbsp; ';
  html += cb(!isDeathAtScene && d.severity === 'สีเหลือง') + ' เหลือง (เร่งด่วน) &nbsp; ';
  html += cb(!isDeathAtScene && d.severity === 'สีเขียว') + ' เขียว (ไม่รุนแรง) &nbsp; ';
  html += cb(!isDeathAtScene && d.severity === 'สีขาว') + ' ขาว (ทั่วไป) &nbsp; ';
  html += cb(isDeathAtScene || d.severity === 'สีดำ') + ' ดำ (รับบริการสาธารณสุขอื่น)' + (isDeathAtScene ? ' NO Tube NO CPR ,NR' : '');
  html += '</div>';
  html += '</div>';

  // ===== 4. เกณฑ์การตัดสินใจส่งโรงพยาบาล =====
  html += '<div class="sec"><div class="sec-title">4. เกณฑ์การตัดสินใจส่งโรงพยาบาล (โดยหัวหน้าทีมและ/ผ่านการเห็นชอบของศูนย์ฯ)</div>';
  html += '<div class="row"><span class="fld">นำส่งโรงพยาบาล ' + ln('รพ.นครไทย', 260) + '</span>' +
    '<span class="chk">' + cb(true) + ' รพ.รัฐ</span><span class="chk">' + cb(false) + ' รพ.เอกชน</span></div>';
  html += '<div class="chklist">เหตุผล ' +
    cb(true) + ' เหมาะสม/สามารถรักษาได้ &nbsp; ' + cb(false) + ' อยู่ไกล &nbsp; ' + cb(false) + ' มีหลักประกัน &nbsp; ' +
    cb(false) + ' เป็นผู้ป่วยเก่า &nbsp; ' + cb(false) + ' เป็นความประสงค์ (เลือกได้มากกว่า 1 ข้อ)' +
    '</div>';
  html += '<div class="row"><span class="fld">ผู้สรุปรายงาน ' + ln(d.reportSummarizer, 140) + ' รหัส ' + ln('', 90) + '</span></div>';
  html += '</div>';

  // ===== 5. การประเมิน/รับรองการนำส่ง (โรงพยาบาล กรอกเอง) =====
  html += '<div class="sec"><div class="sec-title">5. การประเมิน/รับรองการนำส่ง (โดยแพทย์ พยาบาล ประจำโรงพยาบาลที่รับดูแลต่อ) เพิ่ม RC code</div>';
  html += '<div class="row"><span class="fld">HN ' + ln(d.hn, 100) + '</span><span class="fld">การวินิจฉัยโรค ' + ln(d.dx, 300) + '</span></div>';
  // เชื่อมกับระดับการคัดแยก (RC Code) ในข้อ 3: ถ้าเสียชีวิต ณ จุดเกิดเหตุ บังคับ ER Triage ขึ้น "ดำ" เท่านั้นเช่นกัน
  html += '<div class="chklist">ระดับการคัดแยก (ER Triage) ' +
    cb(!isDeathAtScene && d.severity === 'สีแดง') + ' แดง (วิกฤต) L1,L2 &nbsp; ' + cb(!isDeathAtScene && d.severity === 'สีเหลือง') + ' เหลือง (เร่งด่วน) L3 &nbsp; ' + cb(!isDeathAtScene && d.severity === 'สีเขียว') + ' เขียว (ไม่รุนแรง) L4 &nbsp; ' +
    cb(!isDeathAtScene && d.severity === 'สีขาว') + ' ขาว (ทั่วไป) L5 &nbsp; ' + cb(isDeathAtScene || d.severity === 'สีดำ') + ' ดำ (รับบริการสาธารณสุขอื่น) ไม่ใช่ผู้ป่วย' + (isDeathAtScene ? ' NO Tube NO CPR ,NR' : '') +
    '</div>';
  // เชื่อมข้อมูลจากช่อง Treatment ในข้อ 3 (ทางเดินหายใจ/บาดแผล/สารน้ำ/ดามกระดูก/CPR) มาติ๊กในข้อ 5 อัตโนมัติ:
  // - ไม่ได้เลือกอะไร หรือเลือกแค่ "No" -> ติ๊ก "ไม่จำเป็น"
  // - เลือกวิธีการอื่นใด (นอกเหนือจาก No) -> ติ๊ก "ทำและเหมาะสม"
  // ("ไม่ได้ทำ" และ "ทำแต่ไม่เหมาะสม" ต้องใช้ดุลยพินิจของผู้ประเมิน จึงเว้นว่างให้ติ๊กเอง)
  function evalTx_(csv) {
    var arr = String(csv || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    if (arr.length === 0) return 'none';
    if (arr.length === 1 && arr[0] === 'No') return 'none';
    return 'done';
  }
  [
    { lbl: 'ทางเดินหายใจ', csv: d.airway },
    { lbl: 'การห้ามเลือด', csv: d.woundCare },
    { lbl: 'การให้สารน้ำ', csv: d.fluid },
    { lbl: 'การดามกระดูก', csv: d.splint },
    { lbl: 'การทำ CPR', csv: d.cpr }
  ].forEach(function (item) {
    var status = evalTx_(item.csv);
    html += '<div class="chklist sub"><span class="lbl" style="min-width:110px; font-weight:600;">' + item.lbl + '</span>' +
      cb(status === 'none') + ' ไม่จำเป็น &nbsp; ' + cb(false) + ' ไม่ได้ทำ &nbsp; ' + cb(status === 'done') + ' ทำและเหมาะสม &nbsp; ' +
      cb(false) + ' ทำแต่ไม่เหมาะสม ระบุ ' + ln('', 150) + '</div>';
  });
  html += '<div class="row"><span class="fld">ชื่อผู้ประเมิน ' + ln(d.evaluatorName, 200) + '</span>' +
    '<span class="fld">ตำแหน่ง ' + cb(false) + ' แพทย์ ' + cb(true) + ' พยาบาล</span></div>';
  html += '</div>';

  // ===== 6. ผลการรักษาที่/ในโรงพยาบาล =====
  // เชื่อมกับ "ผลการรักษา" ในข้อ 3 ที่เลือกไว้: Admit->Admitted Yes, D/C->ทุเลา, Refer->รักษาต่อที่อื่น, Death->เสียชีวิต ใน รพ.
  html += '<div class="sec sec6"><div class="sec-title">6. ผลการรักษาที่/ในโรงพยาบาล (ติดตามในวันสิ้นเดือน)</div>';
  html += '<div class="row"><span class="fld">Admitted</span><span class="chk">' + cb(d.outcome === 'Admit') + ' Yes</span><span class="chk">' + cb(false) + ' No</span></div>';
  html += '<div class="chklist">' +
    cb(d.outcome === 'D/C') + ' ทุเลา &nbsp; ' + cb(d.outcome === 'Refer') + ' รักษาต่อที่อื่น &nbsp; ' + cb(false) + ' ยังรักษาใน รพ. &nbsp; ' +
    cb(d.outcome === 'Death') + ' เสียชีวิต ใน รพ. &nbsp; ' + cb(false) + ' ปฏิเสธการรักษา/หนีกลับ &nbsp; ' + cb(false) + ' กลับไปตายบ้าน &nbsp; ' + cb(false) + ' ตามแล้วไม่ทราบผล' +
    '</div>';
  html += '</div>';

  html += '</div>'; // .frame

  html += '<div class="footnote">ส่งแบบบันทึกกลับมาที่สำนักงานระบบบริการการแพทย์ฉุกเฉินประจำจังหวัดก่อนวันสิ้นเดือนนั้น</div>';
  html += '<div class="sysnote">บันทึกโดย ' + e(d.staffId) + ' เมื่อ ' + t(row[0]) + ' — ข้อมูลตัวหนาเติมจากระบบ NKT Rescue อัตโนมัติ ส่วนที่เหลือ (สิทธิการรักษา, รายละเอียดบาดแผล/การรักษาแบบละเอียด, ส่วนที่ 5 และ 6) ให้เจ้าหน้าที่/โรงพยาบาลกรอกเพิ่มเติมด้วยมือหลังพิมพ์</div>';

  html += '</body></html>';
  return html;
}

// แบบฟอร์ม ALS เปล่า (ไม่มีข้อมูล) สำหรับพิมพ์ให้เจ้าหน้าที่กรอกด้วยมือ
function buildSummaryHtml_(ym) {
  ym = (ym && /^\d{4}-\d{2}$/.test(ym)) ? ym : Utilities.formatDate(new Date(), TZ, 'yyyy-MM');
  var appUrl = ScriptApp.getService().getUrl();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // ===== อ่านข้อมูล EMS เดือนนี้ =====
  var emsSh = ss.getSheetByName('EMS_' + ym);
  var emsTotal = 0, traumaCount = 0, nonTraumaCount = 0, foundCount = 0, notFoundCount = 0;
  var severityCounts = { 'สีแดง': 0, 'สีเหลือง': 0, 'สีเขียว': 0, 'สีขาว': 0, 'สีดำ': 0 };
  var areaCounts = {};
  EMS_AREAS.forEach(function (a) { areaCounts[a] = 0; });
  if (emsSh && emsSh.getLastRow() >= 2) {
    var emsVals = emsSh.getRange(2, 1, emsSh.getLastRow() - 1, EMS_HEADERS.length).getValues();
    emsVals.forEach(function (row) {
      if (!row[1]) return; // แถวว่าง
      emsTotal++;
      if (row[14] === 'Trauma') traumaCount++;
      else if (row[14] === 'Non-Trauma') nonTraumaCount++;
      if (row[15] === 'พบเหตุ') foundCount++;
      else if (row[15] === 'ไม่พบเหตุ') notFoundCount++;
      if (severityCounts.hasOwnProperty(row[13])) severityCounts[row[13]]++;
      if (areaCounts.hasOwnProperty(row[32])) areaCounts[row[32]]++;
    });
  }

  // ===== อ่านข้อมูล REFER เดือนนี้ =====
  var referSh = ss.getSheetByName('REFER_' + ym);
  var referTotal = 0;
  var hospitalCounts = {};
  REFER_HOSPITALS.forEach(function (h) { hospitalCounts[h] = 0; });
  var referTraumaCount = 0, referNonTraumaCount = 0;
  if (referSh && referSh.getLastRow() >= 2) {
    var referVals = referSh.getRange(2, 1, referSh.getLastRow() - 1, REFER_HEADERS.length).getValues();
    referVals.forEach(function (row) {
      if (!row[1]) return;
      referTotal++;
      if (hospitalCounts.hasOwnProperty(row[6])) hospitalCounts[row[6]]++;
      if (row[10] === 'Trauma') referTraumaCount++;
      else if (row[10] === 'Non-Trauma') referNonTraumaCount++;
    });
  }

  function e(v) { return htmlEscape_(v); }

  function barRow(icon, label, count, max, color) {
    var pct = max > 0 ? Math.round((count / max) * 100) : 0;
    return '<div class="bar-row">' +
      '<span class="bar-label">' + icon + ' ' + e(label) + '</span>' +
      '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%; background:' + color + ';"></div></div>' +
      '<span class="bar-count">' + count + '</span>' +
      '</div>';
  }

  // KPI tile สไตล์การ์ดสีไล่โทน พร้อมไอคอน — ให้ดูทันสมัยแบบ dashboard ทั่วไป
  function kpiTile(icon, num, label, gradient) {
    return '<div class="kpi-tile" style="background:' + gradient + ';">' +
      '<div class="kpi-icon">' + icon + '</div>' +
      '<div class="kpi-num">' + num + '</div>' +
      '<div class="kpi-lbl">' + e(label) + '</div>' +
      '</div>';
  }

  // โดนัทชาร์ต (CSS conic-gradient ล้วนๆ ไม่ต้องพึ่งไลบรารีภายนอก) + legend พร้อมจำนวน/เปอร์เซ็นต์
  function donutChart(segments, total) {
    if (!total) {
      return '<div class="donut-wrap">' +
        '<div class="donut donut-empty"></div>' +
        '<div class="donut-legend"><div class="donut-empty-msg">ยังไม่มีข้อมูลเดือนนี้</div></div>' +
        '</div>';
    }
    var stops = [];
    var acc = 0;
    segments.forEach(function (seg) {
      var startPct = (acc / total) * 100;
      acc += seg.count;
      var endPct = (acc / total) * 100;
      if (seg.count > 0) stops.push(seg.color + ' ' + startPct.toFixed(2) + '% ' + endPct.toFixed(2) + '%');
    });
    var gradientCss = stops.length ? 'conic-gradient(' + stops.join(', ') + ')' : '#e5e9ee';
    var legendHtml = segments.map(function (seg) {
      var pct = total > 0 ? Math.round((seg.count / total) * 100) : 0;
      return '<div class="donut-legend-row">' +
        '<span class="dot" style="background:' + seg.color + ';"></span>' +
        '<span class="donut-legend-lbl">' + e(seg.label) + '</span>' +
        '<span class="donut-legend-val">' + seg.count + ' <small>(' + pct + '%)</small></span>' +
        '</div>';
    }).join('');
    return '<div class="donut-wrap">' +
      '<div class="donut" style="background:' + gradientCss + ';"><div class="donut-hole"><div class="donut-total">' + total + '</div><div class="donut-total-lbl">เคส</div></div></div>' +
      '<div class="donut-legend">' + legendHtml + '</div>' +
      '</div>';
  }

  // แผนที่สรุปแบบแผนผัง (SVG) — จุดศูนย์กลางคือ ER รพ.นครไทย แตกเส้นประออกไปแต่ละตำบล
  // พร้อมวงกลมสีบอกจำนวนเคสของตำบลนั้นๆ (ขนาดวงกลมโตขึ้นตามจำนวนเคส) ทำนองเดียวกับแผนที่ระยะทางที่เห็นทั่วไป
  function buildAreaMapSvg_(areas, counts) {
    var palette = ['#146aa8', '#5c9a1e', '#e08a2c', '#7b3fa0', '#c0392b', '#16a085', '#2f8fd1', '#b8590f', '#8bd13c', '#a561c9', '#e74c3c'];
    var max = Math.max.apply(null, areas.map(function (a) { return counts[a] || 0; }).concat([1]));
    var cx = 320, cy = 320, R = 205;
    var n = areas.length;
    var pts = areas.map(function (a, i) {
      var angle = (-90 + (360 / n) * i) * Math.PI / 180;
      return {
        x: cx + R * Math.cos(angle),
        y: cy + R * Math.sin(angle),
        area: a,
        count: counts[a] || 0,
        color: palette[i % palette.length]
      };
    });
    var svg = '<svg viewBox="0 0 640 620" xmlns="http://www.w3.org/2000/svg" style="width:100%; max-width:520px; height:auto; display:block; margin:0 auto; font-family:Sarabun,sans-serif;">';
    // เส้นประจากศูนย์กลางไปแต่ละตำบล (วาดก่อนเพื่อให้อยู่ใต้วงกลม)
    pts.forEach(function (p) {
      svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + p.x.toFixed(1) + '" y2="' + p.y.toFixed(1) + '" stroke="#c3ceda" stroke-width="2" stroke-dasharray="5,5" />';
    });
    // จุดศูนย์กลาง (โรงพยาบาล/จุดเริ่มออกเหตุ)
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="44" fill="#0a2e4d" />';
    svg += '<text x="' + cx + '" y="' + (cy - 3) + '" text-anchor="middle" font-size="15" font-weight="700" fill="#fff">🚑 ER</text>';
    svg += '<text x="' + cx + '" y="' + (cy + 15) + '" text-anchor="middle" font-size="10.5" fill="#cfe3f5">รพ.นครไทย</text>';
    // แต่ละตำบล: วงกลมสี (ขนาดตามจำนวนเคส) + ตัวเลขในวงกลม + ชื่อตำบลกำกับ
    pts.forEach(function (p) {
      var r = 21 + (max > 0 ? (p.count / max) * 19 : 0);
      var labelAbove = p.y < cy - 5;
      var labelY = labelAbove ? (p.y - r - 10) : (p.y + r + 17);
      svg += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + p.color + '" opacity="0.93" stroke="#fff" stroke-width="2" />';
      svg += '<text x="' + p.x.toFixed(1) + '" y="' + (p.y + 5).toFixed(1) + '" text-anchor="middle" font-size="15" font-weight="800" fill="#fff">' + p.count + '</text>';
      svg += '<text x="' + p.x.toFixed(1) + '" y="' + labelY.toFixed(1) + '" text-anchor="middle" font-size="12.5" font-weight="600" fill="#1f2430">' + htmlEscape_(p.area) + '</text>';
    });
    svg += '</svg>';
    return svg;
  }

  var areaMax = Math.max.apply(null, EMS_AREAS.map(function (a) { return areaCounts[a]; }).concat([1]));
  var hospMax = Math.max.apply(null, REFER_HOSPITALS.map(function (h) { return hospitalCounts[h]; }).concat([1]));
  var monthThai = formatThaiDate_(ym + '-01');
  var monthLabel = monthThai ? monthThai.split('/').slice(1).join('/') : ym; // "MM/YYYY(พ.ศ.)"

  var html = '';
  html += '<!doctype html><html><head><meta charset="utf-8">';
  html += '<meta name="viewport" content="width=device-width, initial-scale=1">';
  html += '<title>สรุป EMS & REFER - ' + e(ym) + '</title>';
  html += '<link rel="preconnect" href="https://fonts.googleapis.com">';
  html += '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
  html += '<link href="https://fonts.googleapis.com/css2?family=Kanit:wght@500;600;700&family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">';
  html += '<style>';
  html += '*{box-sizing:border-box;}';
  html += ':root{--navy:#0a2e4d; --blue:#146aa8; --blue-light:#2f8fd1; --hivis:#8bd13c; --hivis-dark:#5c9a1e; --ink:#1f2430; --muted:#5f6b66; --bg:#eef2f6; --card:#ffffff;}';
  html += 'body{font-family:"Sarabun","TH Sarabun New",sans-serif; color:var(--ink); margin:0; padding:0 0 32px; background:var(--bg);}';
  html += '.hero{background:linear-gradient(135deg,var(--navy),var(--blue-light)); color:#fff; padding:22px 16px 26px; text-align:center; border-bottom:5px solid var(--hivis); box-shadow:0 2px 10px rgba(0,0,0,.15);}';
  html += '.hero h1{font-family:"Kanit","Sarabun",sans-serif; font-weight:600; font-size:23px; margin:0; display:flex; align-items:center; justify-content:center; gap:8px;}';
  html += '.hero .sub{font-family:"Kanit","Sarabun",sans-serif; font-size:13px; opacity:.92; margin-top:5px;}';
  html += '.controls{max-width:900px; margin:-20px auto 22px; padding:0 16px; display:flex; justify-content:center;}';
  html += '.controls-inner{background:var(--card); border-radius:14px; box-shadow:0 4px 16px rgba(10,46,77,.16); padding:12px 18px; display:flex; flex-wrap:wrap; gap:12px; align-items:center; justify-content:center;}';
  html += '.controls-inner label{font-size:13.5px; color:var(--muted); display:flex; align-items:center; gap:6px;}';
  html += '.controls-inner select, .controls-inner input{font-size:14.5px; padding:8px 10px; border-radius:9px; border:1.5px solid #d5dde5; font-family:inherit;}';
  html += '.controls-inner button{font-size:14.5px; padding:9px 16px; border-radius:9px; border:none; background:linear-gradient(135deg,var(--hivis-dark),var(--hivis)); color:#fff; font-weight:600; cursor:pointer; box-shadow:0 2px 6px rgba(92,154,30,.35);}';
  html += '.wrap{max-width:900px; margin:0 auto; padding:0 16px;}';
  html += '.kpi-grid{display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:14px; margin-bottom:22px;}';
  html += '.kpi-tile{border-radius:16px; padding:18px 16px; color:#fff; box-shadow:0 6px 16px rgba(10,46,77,.16); position:relative; overflow:hidden;}';
  html += '.kpi-icon{font-size:22px; opacity:.9; margin-bottom:6px;}';
  html += '.kpi-num{font-size:32px; font-weight:800; font-family:"Kanit",sans-serif; line-height:1;}';
  html += '.kpi-lbl{font-size:12.5px; opacity:.92; margin-top:6px;}';
  html += '.panel{background:var(--card); border-radius:16px; box-shadow:0 4px 14px rgba(10,46,77,.08); padding:20px 22px; margin:0 0 18px;}';
  html += '.panel h2{font-family:"Kanit","Sarabun",sans-serif; font-size:16px; font-weight:600; margin:0 0 16px; color:var(--navy); display:flex; align-items:center; gap:7px;}';
  html += '.two-col{display:grid; grid-template-columns:1fr 1fr; gap:16px;}';
  html += '@media (max-width:640px){ .two-col{grid-template-columns:1fr;} }';
  html += '.bar-row{display:flex; align-items:center; gap:10px; margin:8px 0;}';
  html += '.bar-label{width:180px; font-size:13.5px; text-align:right; flex-shrink:0; color:var(--ink);}';
  html += '.bar-track{flex:1; background:#eef1f5; border-radius:7px; overflow:hidden; height:18px;}';
  html += '.bar-fill{height:100%; border-radius:7px; transition:width .3s;}';
  html += '.bar-count{width:36px; font-size:13.5px; font-weight:700; flex-shrink:0; color:var(--navy);}';
  html += '.donut-wrap{display:flex; align-items:center; gap:24px; flex-wrap:wrap; justify-content:center;}';
  html += '.donut{width:170px; height:170px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center; box-shadow:inset 0 0 0 1px rgba(0,0,0,.04);}';
  html += '.donut-empty{background:repeating-conic-gradient(#e9edf1 0 20deg, #f4f6f8 20deg 40deg);}';
  html += '.donut-hole{width:104px; height:104px; border-radius:50%; background:var(--card); display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow:0 1px 4px rgba(0,0,0,.08);}';
  html += '.donut-total{font-size:26px; font-weight:800; color:var(--navy); font-family:"Kanit",sans-serif;}';
  html += '.donut-total-lbl{font-size:11.5px; color:var(--muted);}';
  html += '.donut-empty-msg{font-size:14px; color:var(--muted);}';
  html += '.donut-legend{display:flex; flex-direction:column; gap:9px; min-width:190px;}';
  html += '.donut-legend-row{display:flex; align-items:center; gap:8px; font-size:13.5px;}';
  html += '.dot{width:11px; height:11px; border-radius:50%; flex-shrink:0;}';
  html += '.donut-legend-lbl{flex:1;}';
  html += '.donut-legend-val{font-weight:700; color:var(--navy);}';
  html += '.donut-legend-val small{font-weight:500; color:var(--muted);}';
  html += '.footer-note{text-align:center; font-size:12px; color:var(--muted); margin-top:6px;}';
  html += '@media print{ .no-print{display:none !important;} body{background:#fff;} .hero{-webkit-print-color-adjust:exact; print-color-adjust:exact;} .kpi-tile{-webkit-print-color-adjust:exact; print-color-adjust:exact;} }';
  html += '</style></head><body>';

  html += '<div class="hero">';
  html += '<h1>📊 สรุปข้อมูล EMS &amp; REFER</h1>';
  html += '<div class="sub">ER รพ.สมเด็จพระยุพราชนครไทย &nbsp;·&nbsp; ประจำเดือน ' + e(monthLabel) + '</div>';
  html += '</div>';

  html += '<div class="controls no-print"><div class="controls-inner">';
  html += '<label>🗓️ เลือกเดือน <input type="month" id="ymPicker" value="' + e(ym) + '" onchange="location.href=\'' + appUrl + '?view=summary&ym=\'+this.value;"></label>';
  html += '<button onclick="window.print()">🖨️ พิมพ์ / บันทึกเป็น PDF</button>';
  html += '</div></div>';

  html += '<div class="wrap">';

  html += '<div class="kpi-grid">';
  html += kpiTile('🚑', emsTotal, 'ออกเหตุ EMS ทั้งหมด', 'linear-gradient(135deg,#146aa8,#2f8fd1)');
  html += kpiTile('✅', foundCount, 'พบเหตุ', 'linear-gradient(135deg,#1e8e5a,#3cb87d)');
  html += kpiTile('🚫', notFoundCount, 'ไม่พบเหตุ', 'linear-gradient(135deg,#b8590f,#e08a2c)');
  html += kpiTile('🔁', referTotal, 'ส่งต่อ (REFER) ทั้งหมด', 'linear-gradient(135deg,#7b3fa0,#a561c9)');
  html += '</div>';

  html += '<div class="two-col">';
  html += '<div class="panel"><h2>🩹 ประเภทเหตุ (EMS)</h2>';
  html += barRow('🔴', 'Trauma', traumaCount, emsTotal || 1, '#e74c3c');
  html += barRow('🔵', 'Non-Trauma', nonTraumaCount, emsTotal || 1, '#3498db');
  html += '</div>';
  html += '<div class="panel"><h2>🏥 ประเภทเหตุ (REFER)</h2>';
  html += barRow('🔴', 'Trauma', referTraumaCount, referTotal || 1, '#e74c3c');
  html += barRow('🔵', 'Non-Trauma', referNonTraumaCount, referTotal || 1, '#3498db');
  html += '</div>';
  html += '</div>';

  html += '<div class="panel"><h2>🎯 ระดับความรุนแรง (RC Code)</h2>';
  html += donutChart([
    { label: 'แดง (วิกฤต)', count: severityCounts['สีแดง'], color: '#e74c3c' },
    { label: 'เหลือง (เร่งด่วน)', count: severityCounts['สีเหลือง'], color: '#f1c40f' },
    { label: 'เขียว (ไม่รุนแรง)', count: severityCounts['สีเขียว'], color: '#2ecc71' },
    { label: 'ขาว (ทั่วไป)', count: severityCounts['สีขาว'], color: '#bdc3c7' },
    { label: 'ดำ (เสียชีวิต/อื่นๆ)', count: severityCounts['สีดำ'], color: '#2c3e50' }
  ], emsTotal);
  html += '</div>';

  html += '<div class="two-col">';
  html += '<div class="panel"><h2>🗺️ แผนที่อำเภอนครไทย (ตามตำบล)</h2>' + buildAreaMapSvg_(EMS_AREAS, areaCounts) + '</div>';
  html += '<div class="panel"><h2>📍 จำนวนเหตุแยกตามพื้นที่ (ตำบล)</h2>';
  EMS_AREAS.forEach(function (a) { html += barRow('📍', a, areaCounts[a], areaMax, '#146aa8'); });
  html += '</div>';
  html += '</div>';

  html += '<div class="panel"><h2>🏥 REFER แยกตามโรงพยาบาลที่ส่งต่อ</h2>';
  REFER_HOSPITALS.forEach(function (h) { html += barRow('🏥', h, hospitalCounts[h], hospMax, '#7b3fa0'); });
  html += '</div>';

  html += '<div class="footer-note">อัปเดตอัตโนมัติจากข้อมูลที่บันทึกในระบบ NKT Rescue</div>';

  html += '</div>'; // .wrap
  html += '</body></html>';

  return html;
}

function buildReferFormHtml_(id) {
  var row = getRowById_(id, REFER_HEADERS);
  if (!row) {
    return '<html><body style="font-family:sans-serif;padding:40px;text-align:center;">' +
      '<h2>ไม่พบข้อมูลเคสนี้</h2><p>อาจถูกลบหรือแก้ไขไปแล้ว</p></body></html>';
  }
  var d = {
    date: row[1], patientName: row[2], hn: row[3], age: row[4], dx: row[5],
    referHospital: row[6], team: row[7], severity: row[8], staffId: row[9],
    traumaType: row[10]
  };
  function e(v) { return htmlEscape_(v); }
  function ln(v, minWidth) {
    var w = minWidth || 60;
    return '<span class="line" style="min-width:' + w + 'px;">' + (v ? e(v) : '') + '</span>';
  }
  function cb(checked) { return checked ? '&#9745;' : '&#9744;'; }
  var dateThai = formatThaiDate_(d.date);

  var html = '';
  html += '<!doctype html><html><head><meta charset="utf-8">';
  html += '<title>แบบบันทึก REFER - ' + e(d.patientName) + '</title>';
  html += '<style>';
  html += '@page{ size:A4 portrait; margin:15mm; }';
  html += '*{box-sizing:border-box;}';
  html += 'body{font-family:"Sarabun","TH Sarabun New",sans-serif; font-size:15px; color:#000; margin:0; padding:6px; line-height:1.6;}';
  html += 'h1{font-size:20px; text-align:center; margin:0 0 18px;}';
  html += '.no-print{text-align:center;}';
  html += '.print-btn{margin:8px 0 20px; padding:10px 18px; font-size:14px; cursor:pointer;}';
  html += '.box{border:1.5px solid #000; padding:16px 20px;}';
  html += '.row{display:flex; flex-wrap:wrap; align-items:baseline; gap:6px 22px; margin:8px 0;}';
  html += '.fld{white-space:nowrap;}';
  html += '.line{display:inline-block; border-bottom:1px dotted #000; min-width:60px; padding:0 4px; font-weight:600;}';
  html += '.sec-title{font-weight:700; margin:18px 0 6px; border-bottom:1px solid #ccc; padding-bottom:3px;}';
  html += '.chk{white-space:nowrap; margin-right:16px;}';
  html += '.blankline{border-bottom:1px dotted #000; display:inline-block; min-width:220px;}';
  html += '.sign-row{display:flex; justify-content:space-between; margin-top:60px;}';
  html += '.sign-box{text-align:center; width:45%;}';
  html += '@media print{ .no-print{display:none;} }';
  html += '</style></head><body>';

  html += '<div class="no-print"><button class="print-btn" onclick="window.print()">🖨️ พิมพ์ / บันทึกเป็น PDF</button></div>';
  html += '<h1>แบบบันทึกการส่งต่อผู้ป่วย (REFER)<br>ER รพ.สมเด็จพระยุพราชนครไทย</h1>';

  html += '<div class="box">';
  html += '<div class="row"><span class="fld">วันที่ ' + ln(dateThai, 120) + '</span><span class="fld">ผู้บันทึก ' + ln(d.staffId, 140) + '</span></div>';

  html += '<div class="sec-title">ข้อมูลผู้ป่วย</div>';
  html += '<div class="row"><span class="fld">ชื่อ-สกุลผู้ป่วย ' + ln(d.patientName, 260) + '</span><span class="fld">อายุ ' + ln(d.age, 50) + ' ปี</span></div>';
  html += '<div class="row"><span class="fld">HN ' + ln(d.hn, 130) + '</span></div>';
  html += '<div class="row"><span class="fld">Dx (การวินิจฉัย) ' + ln(d.dx, 400) + '</span></div>';
  html += '<div class="row">' +
    '<span class="chk">' + cb(d.traumaType === 'Trauma') + ' Trauma</span>' +
    '<span class="chk">' + cb(d.traumaType === 'Non-Trauma') + ' Non-Trauma</span>' +
    '</div>';
  html += '<div class="row">ระดับความรุนแรง ' +
    '<span class="chk">' + cb(d.severity === 'ระดับวิกฤต (ฉุกเฉินสีแดง)') + ' วิกฤต (แดง)</span>' +
    '<span class="chk">' + cb(d.severity === 'ระดับฉุกเฉิน (ฉุกเฉินสีเหลือง)') + ' ฉุกเฉิน (เหลือง)</span>' +
    '<span class="chk">' + cb(d.severity === 'ระดับเร่งด่วน (ฉุกเฉินสีเขียว)') + ' เร่งด่วน (เขียว)</span>' +
    '<span class="chk">' + cb(d.severity === 'ระดับไม่เร่งด่วน (ปกติ)') + ' ไม่เร่งด่วน (ขาว)</span>' +
    '</div>';

  html += '<div class="sec-title">การส่งต่อ</div>';
  html += '<div class="row"><span class="fld">ส่งต่อโรงพยาบาล ' + ln(d.referHospital, 300) + '</span></div>';
  html += '<div class="row"><span class="fld">โดย (ทีมนำส่ง) ' + ln(d.team, 220) + '</span></div>';
  html += '<div class="row"><span class="fld">Refer สาขา<span class="blankline">&nbsp;</span></span></div>';

  html += '<div class="sign-row">';
  html += '<div class="sign-box">ลงชื่อ .......................................... ผู้ส่งต่อ<br>วันที่ ....../....../......</div>';
  html += '<div class="sign-box">ลงชื่อ .......................................... ผู้รับส่งต่อ<br>วันที่ ....../....../......</div>';
  html += '</div>';

  html += '</div>'; // .box
  html += '</body></html>';
  return html;
}

function buildBlankALSFormHtml_() {
  var blankRow = [];
  for (var i = 0; i < EMS_HEADERS.length; i++) blankRow.push('');
  var html = buildALSFormHtml_(null, blankRow);
  // ไม่มีข้อมูลจริงให้ดันความสูง จึงปิดการยืดเต็มหน้า ให้แต่ละข้อชิดกันแบบปกติ (จัดระยะเหมือนตอนมีข้อมูล)
  html = html.replace(
    'body{font-family:"Sarabun","TH Sarabun New",sans-serif; font-size:10.2px; color:#000; margin:0; padding:4px; line-height:1.18; display:flex; flex-direction:column; min-height:calc(297mm - 8mm);}',
    'body{font-family:"Sarabun","TH Sarabun New",sans-serif; font-size:10.2px; color:#000; margin:0; padding:4px; line-height:1.18;}'
  );
  html = html.replace(
    '.frame{border:1.5px solid #000; flex:1; display:flex; flex-direction:column; justify-content:space-between;}',
    '.frame{border:1.5px solid #000;}'
  );
  html = html.replace(
    /<div class="sysnote">[\s\S]*?<\/div>/,
    '<div class="sysnote">แบบฟอร์มเปล่า — พิมพ์เพื่อกรอกข้อมูลด้วยมือ</div>'
  );
  return html;
}
