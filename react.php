<?php
declare(strict_types=1);

// จุดเข้า React ที่จำง่าย โดยยังเก็บ index.php เดิมไว้เพื่อไม่ให้ลิงก์/API เก่าเสีย
header('Location: react-app/dist/#/home');
exit;
