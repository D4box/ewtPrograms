// ==UserScript==
// @name		升学 E 网通广告跳过
// @namespace	https://lcwebsite.cn/
// @version		1.2.10-beta.5
// @description	升学 E 网通广告跳过及视频极速播放。
// @author		LC
// @match		http*://web.ewt360.com/site-study/*
// @icon		https://static.lcwebsite.cn/favicon.svg
// @license		MIT License
// ==/UserScript==
// GitHub 仓库地址：https://github.com/lc6464/ewtPrograms

/* 公开更新记录
* 1.2：使用 TypeScript 重写，减少错误发生的可能。
* 1.2.1：增加视频静音功能。
* 1.2.3-beta-2：增加刷新按钮；增加课程错误时自动退出功能。
* 1.2.4-beta：增加“刷视频”功能；完善注释。
* 1.2.4-beta.2：增加“刷视频”功能状态临时储存功能。
* 1.2.4-beta.3：优化“刷视频”功能逻辑；改为本地储存。
* 1.2.5-beta：修复增加的按钮定位问题；修改储存状态逻辑以防止多标签页干扰。
* 1.2.5-beta.2：检测看课进度上传失败的错误提示，若出现则刷新页面；优化按钮添加顺序。
* 1.2.6-alpha：将所有配置选项整合到一个小页面。
* 1.2.6-alpha.2：完善配置选项页面功能。
* 1.2.6-alpha.3：修复一些问题。
* 1.2.7-alpha：修复右上角控制按钮及控制面板 z-index 问题；调整右上角控制按钮字体大小。	GitHub #1
* 1.2.7-alpha.2：增加功能：自动调整清晰度为“清晰”以降低网络占用、暂停视频答题窗口自动确定。	GitHub #1
* 1.2.7-alpha.3：优化调整清晰度逻辑。
* 1.2.8-alpha：增加周看课时长显示功能。（两个注释将在下个版本完善）
* 1.2.8-alpha.2：完善注释（1.2.8-alpha 及此版本未经验证，可能会不稳定或存在较严重的 bug）。
* 1.2.9-alpha：优化获取看课时长逻辑，优化看课时长显示的样式。
* 1.2.9-alpha.2：修复看课时长样式问题。
* 1.2.10-beta：优化获取周看课时长逻辑，为控制面板添加标题，通过一段时间的稳定性测试。
* 1.2.10-beta.2：增加无感刷新时长功能，优化控制面板样式。
* 1.2.10-beta.3：无感刷新时按钮样式出现的 bug 修复，延长无感刷新间隔。
* 1.2.10-beta.4：样式修复，刷新页面内容修改。
* 1.2.10-beta.5：防冲突修改，降低无感刷新看课时长频率，进一步完善注释。
*/

(function ($, styleText) {
	'use strict';
	if (location.protocol !== 'https:') { // HTTP 转 HTTPS
		location.protocol = 'https:';
	}
	else if (location.hash.substr(1,15) === "/otherVideoPlay") { // 判断是否是播放视频页面
		const intervals = {
			removeAD: 0,
			fastPlay: 0,
			fastPlay_2: 0,
			uploadError: 0,
			quality: 0
		}, loopVideoInput = document.createElement('input'); // 创建刷视频开关 <input>
		function closeThisPage() {
			window.close(); // 经测试，在 Microsoft Edge 88 下，若是被 JavaScript 或者 <a> 打开的，可以正常关闭
			const nw = open('', '_self'); // 适配一些旧的浏览器
			if (nw !== null) {
				nw.close();
				window.close();
			}
			location.href = "about:blank";
			window.close(); // 经测试，在 Microsoft Edge 88 下，会打开空页，虽然不会被关闭，但可以减少资源占用
		}
    		async function getVideoTime() {
    			try {
    				const response = await fetch('/customerApi/api/studyprod/lessonCenter/getUserTimeRanking', {
    					credentials: 'same-origin' // 发送验证信息 (cookies)
    				});
    				if (response.ok) { // 判断是否出现 HTTP 异常
    					return await response.json(); // 如果正常，则获取 JSON 数据
    				}
    				else { // 若不正常，返回异常信息
    					return { success: false, msg: `服务器返回异常 HTTP 状态码：HTTP ${response.status} ${response.statusText}.` };
    				}
    			}
    			catch (reason) { // 若与服务器连接异常，返回异常信息
    				return { success: false, msg: '连接服务器过程中出现异常，消息：' + reason.message };
    			}
    		}
		{
			const div = document.createElement('div'), // 创建最外层 <div>
			style = document.createElement('style'), // 创建 <style>
			h2 = document.createElement('h2'); // 创建 <h2> 标题
			div.id = 'LC_Tampermonkery_quickVideoPlayback_Settings'; // 指定 <div> 的 ID
			h2.style.marginBottom = '1.8rem'; // 设定标题的内容和样式
			h2.style.fontSize = '2.8rem';
			h2.style.color = 'white';
			h2.innerText = '视频快速播放控制面板';
			div.appendChild(h2); // 添加标题
			{ // 创建并添加刷新按钮
				const button = document.createElement('button');
				button.innerHTML = '刷新页面';
				button.style.width = '15rem';
				button.addEventListener('click', function () {
					location.reload();
				});
				div.appendChild(button);
			}
			{ // 创建并添加刷视频模式配置开关
				const label = document.createElement('label'), // 创建外层 <label>
				input = loopVideoInput; // 获取刷视频开关 <input>
				label.innerText = '刷视频模式：'; // 设置 <label> 的内容、ID、title 以及 <input> 的 type、hidden、ID
				label.id = 'LC_Tampermonkery_quickVideoPlayback_loopVideoLabel';
				label.title = '右键查看刷视频模式的详情';
				input.type = 'checkbox'; // 设置样式和 <label> 的内容
				input.setAttribute('hidden', 'hidden');
				input.id = 'LC_Tampermonkery_quickVideoPlayback_loopVideoInput';
				if (sessionStorage.getItem('LC_TampermonkeyScripts_quickVideoPlayback_loopVideo') === 'true') { // 检测 sessionStorage 中是否储存启用刷视频的信息
					input.checked = true; // 若检测到储存则启用刷视频功能
					sessionStorage.removeItem('LC_TampermonkeyScripts_quickVideoPlayback_loopVideo'); // 删除储存信息
				}
				window.addEventListener('beforeunload', function () {
					if (input.checked) { // 若刷视频功能已启用则写入 sessionStorage
						sessionStorage.setItem('LC_TampermonkeyScripts_quickVideoPlayback_loopVideo', 'true');
					}
				});
				label.appendChild(input);
				{
					const labelIn = document.createElement('label'); // 创建里层 <label>
					labelIn.setAttribute('for', 'LC_Tampermonkery_quickVideoPlayback_loopVideoInput'); // 设置里层 <label> 的 for 和内容
					labelIn.innerHTML = '<span>&nbsp;</span>';
					label.appendChild(labelIn); // 将里层 <label> 加入外层 <label>
				}
				label.addEventListener('contextmenu', function (e) {
					alert('若启用刷视频模式，则视频会不断循环播放。\r\n若禁用刷视频模式，当前视频播放完成后标签页会被关闭。');
					e.preventDefault(); // 阻止默认事件
				});
				div.appendChild(label); // 将外层 <label> 加入 <div>
			}
			style.innerHTML = styleText; // 给 <style> 赋值
			document.head.appendChild(style); // 将 <style> 加入 head
			{ // 增加获取周看课时长显示 <div>
				const timeDiv = document.createElement('div'), // 创建三个元素
				span = document.createElement('span'), button = document.createElement('button');
				timeDiv.innerText = '周看课时长：'; // 设置 <div> 内容
				timeDiv.style.marginTop = '0.8rem'; // 设置 <div> 样式
				span.innerText = '加载中';
				(async function () {
					const playTime = await getVideoTime(); // 获取时长
					span.innerText = playTime.success ? (playTime.data.playTime + 'min') : '加载失败'; // 将时长写入 <span>
				})();
				button.innerText = '刷新'; // 设置按钮内容
				button.style.height = '3.5rem'; // 设置按钮样式
				button.style.fontSize = '2rem';
				button.style.width = '6rem';
				button.style.marginLeft = '1rem';
				button.addEventListener('click', async function () {
					this.innerText = '刷新中……'; // 更改按钮内容
					this.style.width = '8rem'; // 更改按钮样式
					this.style.fontSize = '1.5rem';
					span.innerText = '加载中';
					const playTime = await getVideoTime(); // 获取时长
					span.innerText = playTime.success ? (playTime.data.playTime + 'min') : '加载失败'; // 将时长写入 <span>
					this.innerText = '刷新'; // 更改按钮内容
					this.style.fontSize = '2rem'; // 更改按钮样式
					this.style.width = '6rem';
				});
				timeDiv.appendChild(span); // 先将时长 <span> 加入 <div>
				timeDiv.appendChild(button); // 再将刷新按钮加入 <div>
				div.appendChild(timeDiv); // 将 <div> 添加进控制面板 <div>
				async function noSenseRefreshTime() {
					button.innerText = '刷新中……'; // 更改刷新按钮内容
					button.style.width = '8rem'; // 更改按钮样式
					button.style.fontSize = '1.5rem';
					const playTime = await getVideoTime(); // 获取时长
					span.innerText = playTime.success ? (playTime.data.playTime + 'min') : span.innerText; // 将时长写入 <span>
					button.innerText = '刷新'; // 更改刷新按钮内容
					button.style.fontSize = '2rem'; // 更改按钮样式
					button.style.width = '6rem';
				}
				setInterval(noSenseRefreshTime, 30000); // 注册无感刷新时长事件循环
				{ // 创建并添加显示/隐藏控制面板按钮
					const buttonIn = document.createElement('button'), // 创建 <button>
					style = buttonIn.style; // 获取样式
					buttonIn.dataset.showed = 'false';
					buttonIn.innerHTML = '展示控制面板';
					buttonIn.addEventListener('click', function () {
						if (this.dataset.showed === 'false') {
							div.style.top = '50%';
							this.dataset.showed = 'true';
							this.innerHTML = '隐藏控制面板';
							noSenseRefreshTime();
						}
						else {
							div.style.top = '-50rem';
							this.dataset.showed = 'false';
							this.innerHTML = '展示控制面板';
						}
					});
					style.top = '5%'; // 一些样式
					style.right = '3%';
					style.position = 'fixed';
					style.width = '15rem';
					style.height = '4rem';
					style.background = '#666';
					style.border = 'none';
					style.borderRadius = '3rem';
					style.fontFamily = '"Microsoft YaHei"';
					style.fontSize = '1.6rem';
					style.color = 'white';
					style.zIndex = '6001';
					document.body.appendChild(buttonIn); // 添加到 body
				}
			}
			document.body.appendChild(div); // 将 <div> 加入 body
		}
		addEventListener('load', function () {
			setTimeout(() => {
				if ($('.ant-message-custom-content.ant-message-error') !== null) {
					closeThisPage();
				}
			}, 700);
			intervals.removeAD = setInterval(function () {
				const video = $('video[id^="cc_ad_"]'); // 获取广告 <video>
				if (video !== null) { // 若 <video> 存在
					video.playbackRate = 16; // 将广告 16 倍速播放
					video.volume = 0; // 将广告静音
					const button = $('div.ccH5PlayBtn'); // 获取开始播放的 <div> 按钮
					if (button !== null) { // 若 <div> 存在则点击
						button.click();
					}
					clearInterval(intervals.removeAD); // 取消循环检测广告 <video> 是否存在
					intervals.removeAD = 0;
				}
			}, 500);
			setTimeout(function () {
				intervals.fastPlay = setInterval(function () {
					const video = $('video[id^="cc_"][src^="blob:https://"]'); // 获取学习视频 <video>
					if (video !== null) { // 若 <video> 存在
						video.volume = 0; // 将视频静音
						video.addEventListener('play', function () {
							setTimeout(() => video.playbackRate = 16, 500); // 0.5s 后将视频 16 倍速播放
							intervals.fastPlay_2 = setInterval(function () {
								if (video.playbackRate != 16) { // 若不是则设置
									video.playbackRate = 16;
								}
								else { // 若是则停止循环检测视频播放速率
									clearInterval(intervals.fastPlay_2);
									intervals.fastPlay_2 = 0;
								}
							}, 1000);
						});
						video.addEventListener('pause', function () {
							const item = $('.course_point_question_item'), // 获取选项和确定按钮
							button = $('.ant-btn.ant-btn-primary.ant-btn-block');
							if (item !== null) { // 检测暂停回答问题弹窗是否存在
								item.click(); // 若存在则点击答题结束并确定
								if (button !== null) {
									setTimeout(() => button.click(), 10);
								}
							}
							setTimeout(video.play.bind(video), 250);
						}); // 视频暂停后 250ms 继续播放
						video.addEventListener('ended', function () {
							if (!loopVideoInput.checked) { // 若关闭刷视频模式才关闭页面
								closeThisPage();
							}
						});
						clearInterval(intervals.fastPlay); // 停止循环检测学习视频 <video> 是否存在
						intervals.fastPlay_2 = 0;
					}
				}, 500);
				intervals.quality = setInterval(function () {
					if ($('.ccH5hdul li') !== null) { // 若清晰度选项卡存在
						const selected = $('.ccH5hdul li.selected'); // 获取已选择选项
						if (selected !== null) { // 若已选择选项存在
							if (selected.innerText !== '标清') { // 若清晰度不为清晰
								const button = $('.ccH5hdul li:last-of-type');
								if (button !== null) {
									button.click(); // 将清晰度设为清晰
								}
							}
							else if (selected.innerText === '标清') {
								clearInterval(intervals.quality); // 若清晰度为清晰则停止循环
								intervals.quality = 0;
							}
						}
					}
				}, 500);
				intervals.uploadError = setInterval(function () {
					if ($('img[alt="课程同步失败了"]') !== null) { // 若出现则刷新页面
						location.reload();
					}
				}, 2500);
			}, 4000);
		});
	}
})(document.querySelector.bind(document), `\
#LC_Tampermonkery_quickVideoPlayback_Settings {
	position: fixed;
	left: 50%;
	top: -50rem;
	transform: translate(-50%, -50%);
	z-index: 6000;
	background: #111;
	color: white;
	padding: 10rem 20rem;
	min-height: 15rem;
	min-width: 40rem;
	box-sizing: content-box;
	font-family: "Microsoft YaHei";
	font-size: 2rem;
	text-align: center;
	user-select: none;
	transition: top .5s ease-in-out;
}
#LC_Tampermonkery_quickVideoPlayback_Settings button {
	font-size: 2.5rem;
	background: #444;
	border: none;
	border-radius: 1.5rem;
	height: 4rem;
}
#LC_Tampermonkery_quickVideoPlayback_loopVideoLabel {
	display: block;
	margin-top: 1rem;
	cursor: pointer;
}
#LC_Tampermonkery_quickVideoPlayback_loopVideoLabel > label {
	cursor: pointer;
}
[for="LC_Tampermonkery_quickVideoPlayback_loopVideoInput"] {
	width: 8rem;
	display: inline-block;
	background: #444;
	border-radius: 2rem;
	text-align: left;
	transition: background .3s ease-in-out;
}
[for="LC_Tampermonkery_quickVideoPlayback_loopVideoInput"] span {
	background: white;
	display: inline-block;
	width: 2rem;
	height: 2rem;
	line-height: 2rem;
	border-radius: 50%;
	margin-left: 0.55rem;
	transition: margin-left .3s ease-in-out;
}
#LC_Tampermonkery_quickVideoPlayback_loopVideoInput:checked + label {
	background: green;
}
#LC_Tampermonkery_quickVideoPlayback_loopVideoInput:checked + label span {
	margin-left: 5.55rem;
}`);
