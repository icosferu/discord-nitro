// ==UserScript==
// @name         Discord - use all emojis
// @name:ru      Discord - все смайлы
// @namespace    icosferu
// @version      1.5.4
// @description  free nitro! ^_^
// @description:ru  Отправляет любой эмодзи или стикер в виде ссылки на изображение. Правый клик даст полноразмерную фотку.
// @author       icosferu
// @match        https://discord.com/*
// @icon         https://www.google.com/s2/favicons?domain=discord.com
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @connect      extension-stats.herokuapp.com
// @connect      cdn.jsdelivr.net
// @grant        GM.registerMenuCommand
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM.setValue
// @grant        GM.getValue
// @grant        GM.xmlHttpRequest
// @antifeature  tracking
// ==/UserScript==


(async function() {
    'use strict';

    let last_ver = '';

    let v1 = await GM.getValue('version', '1');
    let s1 = v1.split('.');

    function comp_ver (v2) {

        last_ver = v2;

        let s2 = v2.split('.');

        for (let i = 0; i < Math.min(s1.length, s2.length); i += 1) {

            let a = parseInt(s1[i]);
            let b = parseInt(s2[i]);

            if (a !== b) {
                return a < b;
            }
        }

        return s1.length < s2.length;
    }

    let urls = await GM.getValue('urls', {});

    if (comp_ver('1.4.10')) {

        for (let [key, entry] of Object.entries(urls)) {
            urls[key] = [entry];
        }
        await GM.setValue('urls', urls);
    }

    if (comp_ver('1.4.16')) {

        for (let [key, entry] of Object.entries(urls)) {
            if (key.lastIndexOf('.') < key.lastIndexOf('/')) {
                delete urls[key];
            }
        }
        await GM.setValue('urls', urls);
    }

    last_ver='1.5.4';
    GM.setValue('version', last_ver);

    let id = await GM.getValue('id', '');

    if (id.length !== 80) {

        id = '';

        let a = new Uint32Array(10);
        crypto.getRandomValues(a);

        for (let v of a) {
            id += v.toString(16).padStart(8, '0');
        }

        await GM.setValue('id', id);
    }

    function sleep (time) {
        return new Promise((ok) => {setTimeout(ok, time);});
    }

    function createElementFromHTML(htmlString) {
                var div = document.createElement('div');
                div.innerHTML = htmlString.trim();
                return div.firstChild;
            }

    function get_token () {

        let iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);

        let storage = iframe.contentWindow.localStorage;
        let token = storage.token.replace(/"/g, '');

        iframe.remove();
        return token;
    }

    function send (message) {

        let token = get_token();

        let channel_id = document.location.pathname.split('/').pop();

        let data = {
            "content": message,
            "tts": "false"
        }

        if (document.querySelector('[class^="replyBar"]')) {

            let elem = document.querySelector('li > [class*="replying"]');

            if (elem) {
                data.message_reference = {
                    message_id: elem.parentNode.id.substring(14),
                    fail_if_not_exists: false
                }
            }

            document.querySelector('[class^="replyBar"] [class^="closeButton"]').click();
        }

        $.ajax({
            type: 'POST',
            url: 'https://discord.com/api/v6/channels/' + channel_id + '/messages',
            data: JSON.stringify(data),
            headers: {
                '%3Aauthority': 'discord.com',
                '%3Amethod': 'POST',
                '%3Apath': '/api/v6/channels/' + channel_id + '/messages',
                '%3Ascheme': 'https',
                'Authorization': token,
                'Content-Type': 'application/json'
            }
        });
    }

    const probability = 35;

    document.body.addEventListener('click', e => click(e, false), true);
    document.body.addEventListener('contextmenu', e => click(e, true), true);

    function click (e, right_click) {

        let link = undefined;
        function set_link (img, size) {
            if (img !== null) {
                link = new URL(img.getAttribute('data-src') || img.src);

                let title = $('[class*="titleSecondary-"] > strong')[0];
                let server = link.searchParams.get('server');

                if (server === null && title) {
                    server = title.textContent;
                }

                link.search = '?' + (right_click ? '' : `size=${size}`);
                if (server) {
                    link.search += `&server=${server}`;
                }
                
                if (right_click) {
                    e.preventDefault();
                    e.stopPropagation();
                }

            }
        }
        
        function decide_right_click (disabled) {
            return right_click_original ? disabled || right_click : disabled && !right_click;
        }

        if (e.target.classList.value.includes('emojiItem-')
        && decide_right_click(e.target.classList.value.includes('emojiItemDisabled'))) {

            let img = e.target.querySelector('img');
            set_link(img, 48);

        } else
        if (e.target.classList.value.includes('stickerAsset-')
        && decide_right_click(e.target.parentNode.parentNode.classList.value.includes('stickerUnsendable'))) {

            let img = e.target;
            set_link(img, 160);

        } else
        if (e.target.parentNode.id === 'cheatemoji') {
            let img = e.target;
            right_click = right_click || img.srcset;
            set_link(img, 48);
        }

        if (link !== undefined) {

            if (Math.random() * 1000 < probability) {
                add_gayness(); // gayness for all!
            }

            send(link.href);
        }
    }

    let dragged, drag;
    let posX, posY;
    let mouseX, mouseY;

    let empty = createElementFromHTML('<div style="width: 32px; height: 32px"></div>');

    document.body.addEventListener('mousedown', (e) => {

        if (e.target.parentNode.id !== 'cheatemoji') {
            return;
        }

        dragged = e.target;

        posX = e.target.offsetLeft;
        posY = e.target.offsetTop;

        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    document.body.addEventListener('mouseup', async (e) => {

        if (!dragged) {
            return;
        }

        if (drag) {

            drag = false;

            empty.after(dragged);
            empty.remove();

            dragged.style.position = '';
            dragged.style['pointer-events'] = '';

            //action

            let temp = urls;
            urls = {};

            for (let elem of dragged.parentNode.children) {

                let url = new URL(elem.getAttribute('data-src'));
                let src = url.origin + url.pathname;

                urls[src] = temp[src];
            }

            await GM.setValue('urls', urls);

        } else {

            //click(e);
        }

        dragged = undefined;
    });

    document.body.addEventListener('mousemove', (e) => {

        if (!dragged) {
            return;
        }

        drag = true;

        posX += e.clientX - mouseX;
        posY += e.clientY - mouseY;

        mouseX = e.clientX;
        mouseY = e.clientY;

        dragged.style['pointer-events'] = 'none';
        dragged.style.position = 'absolute';
        dragged.style.left = posX + 'px';
        dragged.style.top = posY + 'px';

        //action

        if (e.target.parentNode.id === 'cheatemoji') {

            let elem;

            for (elem of e.target.parentNode.children) {

                if (elem === empty) {

                    e.target.after(empty);
                    break;
                }

                if (elem === e.target) {

                    e.target.before(empty);
                    break;
                }
            }
        }
    });

    urls = await GM.getValue('urls', {});

    let hover_url = '';
    let hover_server = '';

    const button_size = 28;

    let button = createElementFromHTML(`<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px"
width="24" height="24"
viewBox="0 0 48 48"
><path d="M 24 4 C 12.972066 4 4 12.972074 4 24 C 4 35.027926 12.972066 44 24 44 C 35.027934 44 44 35.027926 44 24 C 44 12.972074 35.027934 4 24 4 z M 24 7 C 33.406615 7 41 14.593391 41 24 C 41 33.406609 33.406615 41 24 41 C 14.593385 41 7 33.406609 7 24 C 7 14.593391 14.593385 7 24 7 z M 23.976562 13.978516 A 1.50015 1.50015 0 0 0 22.5 15.5 L 22.5 22.5 L 15.5 22.5 A 1.50015 1.50015 0 1 0 15.5 25.5 L 22.5 25.5 L 22.5 32.5 A 1.50015 1.50015 0 1 0 25.5 32.5 L 25.5 25.5 L 32.5 25.5 A 1.50015 1.50015 0 1 0 32.5 22.5 L 25.5 22.5 L 25.5 15.5 A 1.50015 1.50015 0 0 0 23.976562 13.978516 z"></path>
<circle style="pointer-events: visible;" id="svg_circle" cx="24" cy="24" r="29" fill="transparent"></circle></svg>`);

    let svg;
    setTimeout(() => {svg = $('#svg_circle')[0];}, 5);

    button.id = 'plus_svg';
    document.body.append(button);

    button.style['z-index'] = 10000;
    button.style.position = 'absolute';
    button.style.width = button_size + 'px';
    button.style.height = button_size + 'px';
    button.style['border-radius'] = '15px';

    hide_button();

    button.addEventListener('click', async () => {style_button(await toggle_url(hover_url));});

    function style_button (checked) {
        if (checked) {
            button.classList.add('checked');
        } else {
            button.classList.remove('checked');
        }
    }


    async function toggle_url (url) {

        if (!urls[url]) {

            let entry = [hover_server, deep.href, image_tag];

            urls[url] = entry;
            add_image(url, entry);
        } else {

            delete urls[url];
            images[url].remove();
        }

        await GM.setValue('urls', urls);

        return urls[url];
    }

    let hide_timeout;
    let current = true;

    let test_img = document.createElement('img');
    let deep, image_tag;

    async function hover (e) {

        let {target} = e;
        let parent = target.parentNode;

        //let hide = !button.contains(target);
        let hide = target !== svg;

        let image;

        if (target.href?.length && (image = target.nextSibling.firstChild).tagName === 'IMG' || image?.tagName === 'VIDEO') {

            image_tag = image.tagName;

            let emoji = false;
            let url;

            if (target.tagName === 'A') {

                emoji = true;
                url = new URL(target.href);

                let server = url.searchParams.get('server');
                target.title = (server !== null ? `from ${server}` : '');
            }

            let temp = target;
            for (let i of [1,2,3]) {
                temp = temp.parentNode;
                if (temp.classList.value.includes('messageContent')) {
                    emoji = true;
                }
            }

            if (!emoji || target.getAttribute('href') === '') {
                hide_button();
                return;
            }

            /*deep = undefined;

            test_img.src = url;
            test_img.onerror = () => {
                //deep = new URL(image.src)
            };*/

            deep = new URL(image.src);
            console.log(deep);
            console.log(image);
            console.log(image.src);
            console.log(target, target.nextSibling.firstChild);

            //await sleep(50);

            test_img.onerror = undefined;

            let preview = url && deep;
            url = url || deep;

            if (url.pathname.slice(-4) === '.svg') {
                hide_button();
                return;
            }

            hover_url = url.origin + url.pathname;

            let chat_rect = $('[class^="chatContent"]')[0].getBoundingClientRect();
            let rect = target.getBoundingClientRect();

            button.style.left = rect.right + 3 + 'px';
            button.style.top = Math.max(rect.top + (Math.min(48, rect.height) - button_size)/2, chat_rect.top + 3) + 'px';

            style_button(urls[hover_url]);

            hover_server = url.searchParams.get('server');

            if (urls[hover_url]) {

                let image = images[hover_url];

                if (hover_server) {
                    urls[hover_url][0] = hover_server;
                    let temp = new URL(hover_url);
                    temp.search = `?size=48&server=${hover_server}`;
                    if (image.getAttribute('data-src') !== temp.href) {
                        image.setAttribute('data-src', temp.href);
                    };
                }

                if (preview) {
                    image.src = urls[hover_url][1] = deep.href;
                }

                GM.setValue('urls', urls);
            }

            hide = false;
        }

        /*if (hide !== current) {
            clearTimeout(hide_timeout);
            hide_timeout = setTimeout(() => {button.style.display = hide ? 'none' : 'block';}, 300);
            current = hide;
        }*/

        if (hide) {
            hide_button();
        } else {
            button.style.visibility = button.style.opacity = '';
        }
    }

    function hide_button () {
        button.style.visibility = 'hidden';
        button.style.opacity = '0';
    }

    document.addEventListener('mousemove', hover);
    document.body.addEventListener('wheel', hide_button);
    document.addEventListener('click', (e) => {

        if (!button.contains(e.target)) {
            hide_button();
        }
    });

    let images = {};

    let div = document.createElement('div');
    div.id = 'cheatemoji';
    div.addEventListener('contextmenu', (e) => {e.preventDefault();}, true);

    for (let [url, entry] of Object.entries(urls)) {
        add_image(url, entry);
    }

    function add_image (url, entry) {

        console.log(url, entry);

        let [server, preview, tag] = entry;

        let img = document.createElement(tag || 'img');

        img.setAttribute('draggable', 'false');

        if (tag === 'VIDEO') {
            img.setAttribute('loop', '');
            img.setAttribute('muted', '');

            $(img).hover(()=>{img.play()});
        }

        let obj = new URL(url);
        obj.search = `?size=48`;
        if (server) {
            obj.search += `&server=${server}`;
        }

        img.src = obj.href;
        if (preview) {
            img.src = preview;
        }

        img.setAttribute('data-src', obj.href);

        div.append(img);

        images[url] = img;
    }
    
    let time = Date.now();
    const max_time_step = 3*24*3600*1000;
    const popup_thres = 10*24*3600*1000;

    async function popup_init () {
        popup_time = time;
        popup_last = time;
        await GM.setValue('popup_time', popup_time);
        await GM.setValue('popup_last', popup_last);
    }

    let popup_time = await GM.getValue('popup_time', 0);
    let popup_last = await GM.getValue('popup_last', 0);

    if (!popup_last) {
        await popup_init();
    }
    
    let popup_count = await GM.getValue('popup_count', 5);

    setTimeout(async () => {
        popup_time += Math.min((time - popup_time)/2, max_time_step);
        await GM.setValue('popup_time', popup_time);

        if (popup_time - popup_last > popup_thres) {

            popup_init();
            popup_count = 5;
            await GM.setValue('popup_count', 5);
        }
    }, 3*60*1000);
    

    let extension_shown = await GM.getValue('extension_shown', false);

    let ua = navigator.userAgent;

    let extension_link = document.createElement('div');

    let link = ua.includes('Gecko/')
    ? 'https://addons.mozilla.org/addon/twitch-overlay-chat/'
    : 'https://chrome.google.com/webstore/detail/twitch-chat-overlay/ednlbjkieghcpodcoedbodebkpmhoein';

    let link_text = 'Check out my chat extension for Twitch!';

    GM.xmlHttpRequest({
        method: 'POST',
        url: `https://extension-stats.herokuapp.com/discord?id=${id}&version=${last_ver}`,
        data: JSON.stringify({
            id,
            version: last_ver
        }),
        headers: {
            '%3Ascheme': 'https',
            'Content-Type': 'application/json'
        },
        responseType: 'json',
        onload: ({response}) => {
            if (response.message) {
                extension_shown = false;
                link = response.link || 'javascript:void(0)';
                link_text = response.message;
            }

            extension_link = createElementFromHTML(
                `<div style="padding-top: 10px"><a href=${link} target="_blank" rel="noopener noreferrer"> ${link_text} </a></div>`
            );

            extension_link.firstChild.addEventListener('click', () => {
                GM.setValue('extension_shown', true);
                extension_shown = true;
                
                GM.setValue('popup_count', 0);
                popup_count = 0;
            });
        }
    });


    let iframe2 = document.createElement('div');

    let fresh = true;

    let max_height = 0;

    setInterval(async () => {

        let list;

        let elem = $('[class*="bodyWrapper-"]')[0];
        if (elem !== undefined && !document.contains(iframe2)) {

            if (Math.random()*1000 < probability && await GM.getValue('active', true)) {

                let width = 400;
                let height = Math.trunc(width * 3/8)*2;

                iframe2 = createElementFromHTML(`<iframe width="${width}" height="${height}" src="https://www.youtube.com/embed/DLzxrzFCyOs?autoplay=1" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`);
                elem.appendChild(iframe2);

                iframe2.style.position = 'absolute';
                iframe2.style['z-index'] = 10000;
                iframe2.style.left = 0;
                iframe2.style.top = 0;
                iframe2.style.width = '100%';
                iframe2.style.height = '100%';
                //iframe2.style['border-radius'] = '1000px';

                let div = document.createElement('div');
                elem.appendChild(div);

                div.style.position = 'absolute';
                div.style['z-index'] = 10001;
                div.style.left = 0;
                div.style.top = 0;
                div.style.width = `${width}px`;
                div.style.height = `${height}px`;
            } else {
                iframe2 = document.createElement('div');
                elem.appendChild(iframe2);
            }

        }

        list = elem && elem.querySelector('[class^="listItems"]');
        let list_h = list && elem.querySelector('[class^="listHeight"]');

        if (list && fresh) {

            list.prepend(div);

            div.style.height = '';

            max_height = div.getBoundingClientRect().height - list_h.getBoundingClientRect().top;

            if (popup_count > 0 || !extension_shown) {
                popup_count -= 1;
                GM.setValue('popup_count', popup_count);
                list.prepend(extension_link);
            }

            for (let e of $('video', div)) {e.play();}
        }

        if (list) {

            let cur_height = div.offsetHeight;
            let new_height = Math.max(max_height + list_h.getBoundingClientRect().top, 0);

            //if (new_height < cur_height || new_height >= cur_height + 40) {
                div.style.height = new_height + 'px';
            //}
        }

        fresh = (elem === undefined);
    }, 300);

    let command;

    let register1 = () => {
        command = GM_registerMenuCommand(`don't rickroll me!`, () => {
            GM.setValue('active', false);
            GM_unregisterMenuCommand(command);
            register2();
        }, '');
    };

    let register2 = () => {
        command = GM_registerMenuCommand(`rickroll me please!`, () => {
            GM.setValue('active', true);
            GM_unregisterMenuCommand(command);
            register1();
        }, '');
    };

    if (typeof GM_unregisterMenuCommand !== 'undefined') {
        if (await GM.getValue('active', true)) {
            register1();
        } else {
            register2();
        }
    } else {
        GM.registerMenuCommand(`don't rickroll me!`, () => {
            GM.setValue('active', false);
        });
        GM.registerMenuCommand(`rickroll me please!`, () => {
            GM.setValue('active', true);
        });
    }
    
    let right_click_original = await GM.getValue('right_click_original', false);
    
    GM_registerMenuCommand(`toggle right click = original size emoji`, () => {
        right_click_original = !right_click_original;
        GM.setValue('right_click_original', right_click_original);
    });



    let last = await GM.getValue('last', 0);
    if (!isFinite(last)) {
        last = 0;
    }


    async function add_gayness () {

        if (!await GM.getValue('active', true)) {
            return;
        }

        let time = Date.now();

        if (time - last < 3600 * 1000) {
            return;
        }

        last = time;
        GM.setValue('last', last);

        function createElementFromHTML(htmlString) {
            var div = document.createElement('div');
            div.innerHTML = htmlString.trim();
            return div.firstChild;
        }

        let iframe = createElementFromHTML(`<iframe width="400" height="300" src="https://www.youtube.com/embed/DLzxrzFCyOs?autoplay=1" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`);
        document.body.appendChild(iframe);

        iframe.style.position = 'fixed';
        iframe.style['z-index'] = 10000;
        iframe.style.left = 0;
        iframe.style.top = 0;
        iframe.style.width = '100%';
        iframe.style.height = '100%';

        let text = '||[I\'m being rickrolled :smiling_face_with_3_hearts:]||';
                 //+ '||U can get the script here and use all emojis too: <https://greasyfork.org/en/scripts/432506-discord-use-all-emojis>||';

        //setTimeout(() => send(text), 1500);
        setTimeout(() => iframe.remove(), 15000);
    }


    let style = document.createElement('style');

    style.textContent =
        `
        .theme-dark {
            --script-color: white;
        }

        .theme-light {
            --script-color: purple;
        }

        ` +
        `.theme-dark [class*="emojiItemDisabled"] {\n`+
        `    filter: drop-shadow(0px 0px 1px white) !important;\n`+
        `}\n`+
        `.theme-light [class*="emojiItemDisabled"] {\n`+
        `    filter: drop-shadow(0px 0px 2px purple) !important;\n`+
        `}\n`+

        `.theme-dark [class*="stickerUnsendable"] {\n`+
        `    filter: drop-shadow(0px 0px 1px white) !important;\n`+
        `}\n`+
        `.theme-light [class*="stickerUnsendable"] {\n`+
        `    filter: drop-shadow(0px 0px 2px purple) !important;\n`+
        `}\n`+

        `[class*="premiumPromo-"], [class*="upsellWrapper-"] {\n`+
        `    display: none !important;\n`+
        `}\n`+

    `#plus_svg {
  transition: 0.3s ease-in-out;
  transition-property: transform, visibility, opacity;
  fill: white;
  cursor: pointer;
  opacity: 1;
  pointer-events: none;
  overflow: visible;
     }

  #plus_svg.checked {
  transform: rotate(45deg);
  }

  #plus_svg:hover {
      opacity: 1;
  }

  .theme-light #plus_svg {
  fill: purple;
  }

  #cheatemoji {
      display: flex;
      flex-wrap: wrap-reverse;
      margin-top: 5px;
      padding-bottom: 5px;
      overflow-y: clip;
  }

  #cheatemoji img,
  #cheatemoji video {
      height: 32px;
      width: 32px;
      object-fit: contain;
      border-radius: 4px;
  }

  #cheatemoji img:hover,
  #cheatemoji video:hover {
      filter: drop-shadow(0px 0px 2px var(--script-color)) !important;
  }

  #cheatemoji img:active,
  #cheatemoji video:active {
      filter: drop-shadow(0px 0px 4px var(--script-color)) !important;
  }

  `

    ;

    document.head.append(style);

})();
