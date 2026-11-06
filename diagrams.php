<?php
declare(strict_types=1);

require_once __DIR__ . '/src/core/core.php';
require_once __DIR__ . '/src/core/nav.php';

header('Content-Type: text/html; charset=utf-8');
?>
<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>สตูดิโอแผนภาพประกอบการสอน (Diagram Studio) · ผู้ช่วยครู AI</title>
<meta http-equiv="refresh" content="0; url=/diagrams.php">
<script>window.location.replace('/diagrams.php');</script>
</head>
<body>
<p>กำลังเปิดสตูดิโอแผนภาพ... <a href="/diagrams.php">คลิกที่นี่หากไม่เปลี่ยนหน้าอัตโนมัติ</a></p>
</body>
</html>
