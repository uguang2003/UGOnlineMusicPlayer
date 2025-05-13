<?php
/**************************************************
 * MKOnlinePlayer v2.4
 * 后台音乐数据抓取模块
 * 编写：mengkun(https://mkblog.cn)
 * 时间：2018-3-11
 * 特别感谢 @metowolf 提供的 Meting.php
 *************************************************/

/************ ↓↓↓↓↓ 如果网易云音乐歌曲获取失效，请将你的 COOKIE 放到这儿 ↓↓↓↓↓ ***************/
$netease_cookie = '';
/************ ↑↑↑↑↑ 如果网易云音乐歌曲获取失效，请将你的 COOKIE 放到这儿 ↑↑↑↑↑ ***************/
/**
* cookie 获取及使用方法见 
* https://github.com/mengkunsoft/MKOnlineMusicPlayer/wiki/%E7%BD%91%E6%98%93%E4%BA%91%E9%9F%B3%E4%B9%90%E9%97%AE%E9%A2%98
* 
* 更多相关问题可以查阅项目 wiki 
* https://github.com/mengkunsoft/MKOnlineMusicPlayer/wiki
* 
* 如果还有问题，可以提交 issues
* https://github.com/mengkunsoft/MKOnlineMusicPlayer/issues
**/


define('HTTPS', true);    // 如果您的网站启用了https，请将此项置为“true”，如果你的网站未启用 https，建议将此项设置为“false”
define('DEBUG', false);      // 是否开启调试模式，正常使用时请将此项置为“false”
define('JSONP', false);      // 是否开启JSONP模式，使用远程api时请开启
define('CACHE_PATH', 'cache/');     // 文件缓存目录,请确保该目录存在且有读写权限。如无需缓存，可将此行注释掉

/*
 如果遇到程序不能正常运行，请开启调试模式，然后访问 http://你的网站/音乐播放器地址/api.php ，进入服务器运行环境检测。
 此外，开启调试模式后，程序将输出详细的运行错误信息，方便定位错误原因。
 
 因为调试模式下程序会输出服务器环境信息，为了您的服务器安全，正常使用时请务必关闭调试。
*/

/*****************************************************************************************************/
if(!defined('DEBUG') || DEBUG !== true) error_reporting(0); // 屏蔽服务器错误

require_once('plugns/Meting.php');
require_once('plugns/Download.php');

use Metowolf\Meting;
use Mxue\Download;

$source = getParam('source', 'netease');  // 歌曲源
$API = new Meting($source);
$DOWNLOAD = new Download($source);

$API->format(true); // 启用格式化功能

if($source == 'kugou' || $source == 'baidu' || $source == 'tencent') {
    define('NO_HTTPS', true);        // 酷狗、百度音乐和QQ源暂不支持 https
} elseif(($source == 'netease') && $netease_cookie) {
    $API->cookie($netease_cookie);    // 解决网易云 Cookie 失效
}

// 没有缓存文件夹则创建
if(defined('CACHE_PATH') && !is_dir(CACHE_PATH)) createFolders(CACHE_PATH);

$types = getParam('types');
switch($types)   // 根据请求的 Api，执行相应操作
{
    case 'url':   // 获取歌曲链接
        $id = getParam('id');  // 歌曲ID
        $use_local = getParam('use_local', '0');  // 是否强制使用本地源
        
        // 尝试使用第三方 API
        $thirdPartyData = requestThirdPartyApi('url', $id, $source, $use_local);
        
        if($thirdPartyData !== false) {
            // 第三方API成功获取数据
            echojson($thirdPartyData);
        } else {
            // 第三方API失败，使用本地API
            if (defined('DEBUG') && DEBUG === true) {
                error_log("第三方API失败，使用本地API获取音乐URL，歌曲ID: " . $id);
            }
            
            $data = $API->url($id);
            echojson($data);
        }
        break;
        
    case 'pic':   // 获取封面链接
        $id = getParam('id');  // 歌曲ID

        $data = $API->pic($id);
        echojson($data);
        break;
    
    case 'lyric':       // 获取歌词
        $id = getParam('id');  // 歌曲ID

        if(defined('CACHE_PATH')) {
            $cache = CACHE_PATH.$source.'_'.$types.'_'.$id.'.json';
            
            if(file_exists($cache)) {   // 缓存存在，则读取缓存
                $data = file_get_contents($cache);
            } else {
                $data = $API->lyric($id);
                
                // 只缓存链接获取成功的歌曲
                if(isset($data) && isset(json_decode($data)->lyric)) {
                    file_put_contents($cache, $data);
                }
            }
        } else {
            $data = $API->lyric($id);
        }
        
        echojson($data);
        
        break;
    
    case 'userinfo':    // 获取用户详细信息
        $uid = getParam('uid');  // 用户ID
        
        if(defined('CACHE_PATH')) {
            $cache = CACHE_PATH.$source.'_'.$types.'_'.$uid.'.json';
            
            if(file_exists($cache)) {   // 缓存存在，则读取缓存
                $data = file_get_contents($cache);
            } else {
                $url= 'http://music.163.com/api/v1/user/detail/'.$uid;
                $data = file_get_contents($url);

                // 只缓存链接获取成功的用户信息
                if(isset($data) && isset(json_decode($data)->profile)) {
                    file_put_contents($cache, $data);
                }
            }
        } else {
            $url= 'http://music.163.com/api/v1/user/detail/'.$uid;
            $data = file_get_contents($url);
        }
        
        echojson($data);
        break;
        
    case 'userlist':    // 获取用户歌单列表
        $uid = getParam('uid');  // 用户ID
        
        if(defined('CACHE_PATH')) {
            $cache = CACHE_PATH.$source.'_'.$types.'_'.$uid.'.json';
            
            if(file_exists($cache)) {   // 缓存存在，则读取缓存
                $data = file_get_contents($cache);
            } else {
                $url= 'http://music.163.com/api/user/playlist/?offset=0&limit=1001&uid='.$uid;
                $data = file_get_contents($url);

                // 只缓存链接获取成功的用户列表
                if(isset($data) && isset(json_decode($data)->playlist)) {
                    file_put_contents($cache, $data);
                }
            }
        } else {
            $url= 'http://music.163.com/api/user/playlist/?offset=0&limit=1001&uid='.$uid;
            $data = file_get_contents($url);
        }
        
        echojson($data);
        break;
        
    case 'playlist':    // 获取歌单中的歌曲
        $id = getParam('id');  // 歌单ID
        
        // 直接使用本地 meting 获取歌曲列表
        if(defined('CACHE_PATH')) {
            $cache = CACHE_PATH.$source.'_'.$types.'_'.$id.'.json';
            
            if(file_exists($cache)) {   // 缓存存在，则读取缓存
                $data = file_get_contents($cache);
            } else {
                $data = $API->format(false)->playlist($id);
                
                // 只缓存链接获取成功的歌曲
                if(isset($data) && isset(json_decode($data)->playlist->tracks)) {
                    file_put_contents($cache, $data);
                }
            }
        } else {
            $data = $API->format(false)->playlist($id);
        }
        
        echojson($data);
        break;
     
    case 'search':  // 搜索歌曲
        $s = getParam('name');  // 歌名
        $limit = getParam('count', 20);  // 每页显示数量
        $pages = getParam('pages', 1);  // 页码

        if(defined('CACHE_PATH')) {
            $cache = CACHE_PATH.$source.'_'.$types.'_'.md5($s).'_'.$pages.'_'.$limit.'.json';

            if(file_exists($cache)) {   // 缓存存在，则读取缓存
                $data = file_get_contents($cache);
            } else {
                $data = $API->search($s, [
                    'page' => $pages, 
                    'limit' => $limit
                ]);

                // 只缓存链接获取成功的歌曲
                if(isset($data) && json_decode($data)) {
                    file_put_contents($cache, $data);
                }
            }
        } else {
            $data = $API->search($s, [
                'page' => $pages, 
                'limit' => $limit
            ]);
        }
        
        echojson($data);
        
        break;
    
    case 'comments':  // 获取评论
        $id = getParam('id');  // 歌曲id
        $limit = getParam('count', 50);  // 每页显示数量
        $pages = getParam('pages', 1);  // 页码

        if(defined('CACHE_PATH')) {
            $cache = CACHE_PATH.$source.'_'.$types.'_'.$id.'_'.$pages.'_'.$limit.'.json';

            if(file_exists($cache)) {   // 缓存存在，则读取缓存
                $data = file_get_contents($cache);
            } else {
                $data = $API->comments($id, [
                    'page' => $pages, 
                    'limit' => $limit
                ]);

                // 只缓存链接获取成功的歌曲
                if(isset($data) && (isset(json_decode($data)->hot_comment) || isset(json_decode($data)->comment))) {
                    file_put_contents($cache, $data);
                }
            }
        } else {
            $data = $API->comments($id, [
                'page'  => $pages,
                'limit' => $limit
            ]);
        }

        echojson($data);
    
        break;
    
    case 'like':  // 喜欢/取消喜欢歌曲功能
        $id = getParam('id');  // 歌曲id
        $like = getParam('like', '1');  // 1表示喜欢，0表示取消喜欢
        
        // 这个功能需要用户登录网易云音乐，所以检查cookie
        if($netease_cookie) {
            // 使用curl直接调用网易云音乐API，不修改Meting.php
            $url = 'https://music.163.com/api/song/like';
            $post_data = [
                'trackId' => $id,
                'like' => $like === '1' ? 'true' : 'false'
            ];
            
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_POST, 1);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($post_data));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
            curl_setopt($ch, CURLOPT_COOKIE, $netease_cookie);
            curl_setopt($ch, CURLOPT_REFERER, 'https://music.163.com/');
            curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.111 Safari/537.36');
            
            $result = curl_exec($ch);
            curl_close($ch);
            
            $response = [
                'code' => 200,
                'msg' => $like === '1' ? '已添加到我喜欢的音乐' : '已从我喜欢的音乐中移除',
                'result' => json_decode($result)
            ];
            
            echojson(json_encode($response));
        } else {
            // 返回错误信息，提示需要设置cookie
            $data = json_encode([
                'code' => 301,
                'msg' => '请先在api.php中设置您的网易云音乐cookie'
            ]);
            echojson($data);
        }
        break;
        
    case 'download':    // 下载歌曲
        
        $url = getParam('url');
        $name = getParam('name');
        $artist = getParam('artist');
        $direct = getParam('direct', '0'); // 新增参数，是否直接下载(1为直接下载)

        if($direct == '1') {
            // 直接下载模式
            $source = getParam('source', 'netease');
            $artistStr = $artist ? ' - '.$artist : '';
            $filename = $name.$artistStr.'.mp3';
            
            // 设置下载所需的响应头
            header('Content-Type: audio/mpeg');
            header('Content-Disposition: attachment; filename="'.$filename.'"');
            header('Content-Transfer-Encoding: binary');
            header('Cache-Control: no-cache, must-revalidate');
            header('Expires: 0');
            
            // 直接从URL读取并输出
            readfile($url);
            exit;
        } else {
            // 原有的下载处理逻辑
            $data = $DOWNLOAD->download($url, $name, $artist);
            echojson($data);
        }
        break;
    
    case 'cache':
        $minute = getParam('minute', 30);   // 删除几分钟之前的文件

        date_default_timezone_set('Asia/Shanghai'); // 如果时区不同请自行设置时区

        $list = scandir(CACHE_PATH);
        $jsonList = array();

        foreach ($list as $val) {
            $filePath = CACHE_PATH.$val;
            if (is_file($filePath) && pathinfo($filePath, PATHINFO_EXTENSION) === 'json') {
                array_push($jsonList, $filePath);
            }
        }

        $data = array();
        foreach($jsonList as $val) {
            if (strtotime('+'.$minute.' minute', filemtime($val)) <= time()) {
                $filetime = date('Y-m-d H:i:s', filemtime($val));
                if (unlink($val)) {
                    array_push($data, array(
                        'msg' => '删除成功。',
                        'time' => $filetime,
                        'file' => $val,
                    )); 
                } else {
                    array_push($data, array(
                        'msg' => '删除失败，请检查文件权限或其他问题。',
                        'time' => $filetime,
                        'file' => $val,
                    ));
                }
            }
        }

        echojson(json_encode($data));
        break;

    default:
        echo '<!doctype html><html><head><meta charset="utf-8"><title>UG的音乐盒信息</title><style>* {font-family: microsoft yahei}</style></head><body> <h2>UG的音乐盒</h2><br>';
        if(!defined('DEBUG') || DEBUG !== true) {   // 非调试模式
            echo '<p>Api 调试模式已关闭</p>';
        } else {
            echo '<p><font color="red">您已开启 Api 调试功能，正常使用时请在 api.php 中关闭该选项！</font></p><br>';
            
            echo '<p>PHP 版本：'.phpversion().' （本程序要求 PHP 5.4+）</p><br>';
            
            echo '<p>服务器函数检查</p>';
            echo '<p>curl_exec: '.checkfunc('curl_exec',true).' （用于获取音乐数据）</p>';
            echo '<p>file_get_contents: '.checkfunc('file_get_contents',true).' （用于获取音乐数据）</p>';
            echo '<p>json_decode: '.checkfunc('json_decode',true).' （用于后台数据格式化）</p>';
            echo '<p>hex2bin: '.checkfunc('hex2bin',true).' （用于数据解析）</p>';
            echo '<p>openssl_encrypt: '.checkfunc('openssl_encrypt',true).' （用于数据解析）</p>';
        }
        
        echo '</body></html>';
}

/**
 * 创建多层文件夹 
 * @param $dir 路径
 */
function createFolders($dir) {
    return is_dir($dir) or (createFolders(dirname($dir)) and mkdir($dir, 0755));
}

/**
 * 检测服务器函数支持情况
 * @param $f 函数名
 * @param $m 是否为必须函数
 * @return 
 */
function checkfunc($f,$m = false) {
	if (function_exists($f)) {
		return '<font color="green">可用</font>';
	} else {
		if ($m == false) {
			return '<font color="black">不支持</font>';
		} else {
			return '<font color="red">不支持</font>';
		}
	}
}

/**
 * 获取GET或POST过来的参数
 * @param $key 键值
 * @param $default 默认值
 * @return 获取到的内容（没有则为默认值）
 */
function getParam($key, $default='')
{
    return trim($key && is_string($key) ? (isset($_POST[$key]) ? $_POST[$key] : (isset($_GET[$key]) ? $_GET[$key] : $default)) : $default);
}

/**
 * 请求第三方 meting 接口
 * @param $type 请求类型
 * @param $id ID
 * @param $source 音乐源
 * @param $use_local 是否优先使用本地源 (1:使用本地，0:使用第三方)
 * @return 接口返回的数据，失败返回false
 */
function requestThirdPartyApi($type, $id, $source = 'netease', $use_local = 0) {
    // 如果明确要使用本地源，则直接返回false让系统使用本地API
    if ($use_local == 1) {
        return false;
    }
    
    // 只有URL类型请求才使用第三方API，其他类型（搜索、歌词、评论等）都使用本地API
    if ($type != 'url') {
        return false;
    }

    // 构建第三方API请求URL
    $apiUrl = "https://api.qijieya.cn/meting/?server={$source}&type={$type}&id={$id}";

    // 使用curl请求第三方接口
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5); // 5秒超时
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    
    // 处理URL类型请求
    return requestThirdPartyMusicUrl($ch, $apiUrl);
}

/**
 * 专门处理音乐URL请求的函数
 * @param $ch curl句柄
 * @param $apiUrl 第三方API URL
 * @return 音乐URL数据，失败返回false
 */
function requestThirdPartyMusicUrl($ch, $apiUrl) {
    // 先进行头部请求，检查内容类型
    curl_setopt($ch, CURLOPT_NOBODY, true);
    curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    $contentLength = curl_getinfo($ch, CURLINFO_CONTENT_LENGTH_DOWNLOAD);
    
    // 判断是否为成功的HTTP响应
    if ($httpCode < 200 || $httpCode >= 400) {
        curl_close($ch);
        if (defined('DEBUG') && DEBUG === true) {
            error_log("第三方API HTTP请求失败，状态码: " . $httpCode);
        }
        return false;
    }
    
    // 检查是否是音频文件或文档格式的响应
    $isAudioOrDoc = (
        strpos($contentType, 'audio') !== false || 
        strpos($contentType, 'application/octet-stream') !== false ||
        strpos($contentType, 'application/msword') !== false ||  // 处理 doc 类型
        strpos($contentType, 'binary') !== false
    );

    // 如果内容长度为0或太小，可能不是有效的音频文件
    if ($contentLength <= 1000 && $isAudioOrDoc) {
        curl_close($ch);
        if (defined('DEBUG') && DEBUG === true) {
            error_log("第三方API返回的内容长度太小，不可能是有效的音频文件: " . $contentLength);
        }
        return false;
    }
    
    // 根据内容类型判断处理方式
    if ($isAudioOrDoc && $contentLength > 1000) {
        // 是音频文件或二进制流，直接使用URL
        $br = estimateBitrate($contentType, $contentLength);
        curl_close($ch);
        
        // 构建并返回JSON格式的音频URL数据
        return json_encode([
            'url' => $apiUrl,
            'size' => $contentLength,
            'br' => $br,
            'type' => 'audio'
        ]);
    } else if (strpos($contentType, 'application/json') !== false) {
        // 是JSON响应，需要获取并解析内容
        curl_setopt($ch, CURLOPT_NOBODY, false);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HEADER, false);
        $result = curl_exec($ch);
        curl_close($ch);
        
        // 解析JSON响应
        $jsonData = json_decode($result, true);
        if (is_array($jsonData) && isset($jsonData['url']) && !empty($jsonData['url'])) {
            return $result; // 返回JSON字符串
        } else {
            if (defined('DEBUG') && DEBUG === true) {
                error_log("第三方API返回的JSON不包含有效的URL: " . $result);
            }
            return false;
        }
    } else {
        // 既不是音频也不是JSON，可能是无效响应
        curl_close($ch);
        if (defined('DEBUG') && DEBUG === true) {
            error_log("第三方API返回了未知的内容类型: " . $contentType);
        }
        return false;
    }
}

/**
 * 根据内容类型和大小估算音频比特率
 * @param $contentType 内容类型
 * @param $contentLength 内容大小
 * @return 估算的比特率
 */
function estimateBitrate($contentType, $contentLength) {
    $br = 128.000; // 默认比特率
    
    // 根据文件类型和大小估算比特率
    if (strpos($contentType, 'mpeg') !== false || strpos($contentType, 'mp3') !== false) {
        // MP3文件
        if ($contentLength > 10000000) $br = 320.000;      // 大于10MB
        elseif ($contentLength > 5000000) $br = 256.000;   // 大于5MB
        elseif ($contentLength > 2500000) $br = 192.000;   // 大于2.5MB
        elseif ($contentLength > 1500000) $br = 128.000;   // 大于1.5MB
        else $br = 96.000;                                // 小于1.5MB
    } elseif (strpos($contentType, 'flac') !== false) {
        // FLAC文件（无损）
        $br = 900.000;
    } elseif (strpos($contentType, 'wav') !== false) {
        // WAV文件（无损）
        $br = 1400.000;
    } elseif (strpos($contentType, 'aac') !== false || strpos($contentType, 'mp4') !== false) {
        // AAC文件
        if ($contentLength > 8000000) $br = 256.000;
        elseif ($contentLength > 4000000) $br = 192.000;
        else $br = 128.000;
    }
    
    return $br;
}

/**
 * 输出一个json或jsonp格式的内容
 * @param $data 数组内容
 */
function echojson($data)    //json和jsonp通用
{
    header('Content-type: application/json');
    $callback = getParam('callback');
    
    if(defined('HTTPS') && HTTPS === true && !defined('NO_HTTPS')) {    // 替换链接为 https
        $data = str_replace('http:\/\/', 'https:\/\/', $data);
        $data = str_replace('http://', 'https://', $data);
    }
    
    if(defined('JSONP') && JSONP === true && $callback) //输出jsonp格式
    {
        die(htmlspecialchars($callback).'('.$data.')');
    } else {
        die($data);
    }
}