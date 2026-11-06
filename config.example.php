<?php
/**
 * คัดลอกไฟล์นี้เป็น config.php แล้วใส่ API keys ผ่าน environment variables
 * หรือแทนค่าข้อความว่างบนเครื่องของคุณ ห้าม commit config.php
 */
return [
    'api_key' => getenv('GEMINI_API_KEY') ?: '',
    'models' => [
        'text'   => 'gemini-3.8-flash',
        'review' => 'gemini-3.1-pro-preview',
        'image'  => 'gemini-3.1-flash-image',
    ],
    'thinking_level' => 'LOW',
    'daily_limit_per_ip' => (int) (getenv('DAILY_LIMIT_PER_IP') ?: 300),
    'app_password' => getenv('APP_PASSWORD') ?: '',
    'base_url' => getenv('GEMINI_BASE_URL') ?: 'https://generativelanguage.googleapis.com',

    'openai_api_key' => getenv('OPENAI_API_KEY') ?: '',
    'text_provider'  => 'gemini',
    'image_provider' => 'gemini',
    'openai_models' => [
        'text'   => 'gpt-6-luna',
        'review' => 'gpt-6.1-sol',
        'image'  => 'gpt-image-2.5-flare',
    ],
    'openai_image_size'    => '1024x1024',
    'openai_image_quality' => 'low',
    'openai_base_url'      => getenv('OPENAI_BASE_URL') ?: 'https://api.openai.com',

    'openrouter_api_key' => getenv('OPENROUTER_API_KEY') ?: '',
    'openrouter_models' => ['text' => '', 'review' => '', 'image' => ''],
    'openrouter_base_url' => getenv('OPENROUTER_BASE_URL') ?: 'https://openrouter.ai/api/v1',
];
