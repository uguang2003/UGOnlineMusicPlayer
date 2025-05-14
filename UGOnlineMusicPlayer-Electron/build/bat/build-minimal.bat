@echo off
chcp 65001 > nul
setlocal

echo 开始极简打包过程...
cd /d %~dp0\..\..\

REM 创建临时工作目录
echo 准备临时工作环境...
if exist temp_build rmdir /s /q temp_build
mkdir temp_build
mkdir temp_build\resources

REM 复制必要文件到临时目录
echo 复制最小化所需文件...
copy build\scripts\main-minimal.js temp_build\main.js
copy build\scripts\preload-minimal.js temp_build\preload.js
copy build\configs\package-minimal.json temp_build\package.json
mkdir temp_build\resources
copy resources\icon.ico temp_build\resources\

REM 进入临时目录并执行构建
echo 切换到临时目录并开始构建...
cd temp_build

REM 设置环境变量以禁用不必要的功能
set ELECTRON_BUILDER_ALLOW_UNRESOLVED_DEPENDENCIES=true
set CSC_IDENTITY_AUTO_DISCOVERY=false
set ELECTRON_BUILDER_ALLOW_SYMLINKS=true

REM 安装依赖并执行构建
echo 安装最小化依赖中...
call npm install --no-package-lock --only=dev electron electron-builder --quiet --no-fund --no-audit

echo 执行构建中...
call npx electron-builder --win portable --config=../build/configs/electron-builder-minimal.yml

REM 检查构建结果
echo 检查构建结果中...
cd ..
if not exist dist mkdir dist

REM 修复文件复制问题，使用xcopy确保完整复制
if exist temp_build\dist\*.exe (
  echo 正在复制构建结果...
  del /f /q dist\UG音乐极简版.exe 2>nul
  xcopy /y /f temp_build\dist\*.exe dist\UG音乐极简版.exe*
  
  REM 验证文件大小
  for %%F in (dist\UG音乐极简版.exe) do (
    echo 验证文件大小: %%~zF 字节
    if %%~zF LSS 1000000 (
      echo 警告: 文件大小小于预期! 可能复制不完整！
    ) else (
      echo 文件大小正常
    )
  )
  
  echo 正在清理临时目录...
  rmdir /s /q temp_build
  echo =============================================
  echo 构建成功! 文件已保存到: dist\UG音乐极简版.exe
  echo =============================================
) else (
  echo 构建可能失败, 请检查错误信息
  echo 临时目录已保留在temp_build文件夹中以便调试
)

endlocal
pause
