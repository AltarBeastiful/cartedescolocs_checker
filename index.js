const puppeteer = require('puppeteer');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');

const siteName = 'www.lacartedescolocs.fr/colocations/fr/grand-est/strasbourg';
const TELEGRAM_BOT_ID = '';
const CHAT_ID = '';

async function check() {

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

    await page.goto(`https://${siteName}`, { waitUntil: 'networkidle0' });
    await page.click('div#qc-cmp2-ui > div > div > button:nth-child(2)');
    await page.click('div#display_mode_switcher > div:nth-child(2)');
    await page.click('lodging-type-filter');
    await page.click('div[id="lodging_type_dropdown"] > div:nth-child(1)', { waitUntil: 'networkidle0' });
    await page.click('div[id="lodging_type_dropdown"] > div:nth-child(4)', { waitUntil: 'networkidle0' });
    await page.waitForSelector('div#listings_container_cache', { hidden: true });
    await page.waitForTimeout(1000);

    const result = await page.evaluate(() => {
        let article_node_list = document.querySelectorAll('article.listing_cell');

        if (article_node_list.length <= 1)
            return [];

        let articles = []
        for (const article_node of article_node_list) {
            let article = {
                title: article_node.querySelector('div > a').textContent,
                href: article_node.querySelector('div > a').getAttribute('href'),

            }
            articles.push(article)
        }
        return articles
    });

    if (result.length <= 1){
        console.log(`Found ${result.length} articles`);
        return;
    }

    let rawdata = fs.readFileSync('results.json');
    let previous_results = JSON.parse(rawdata);

    let new_results = result.filter(article => previous_results.find(res => res.href == article.href) == undefined)

    const bot = new TelegramBot(TELEGRAM_BOT_ID);
    for (const new_result of new_results) {
        bot.sendMessage(CHAT_ID, new_result.title + '\n http://www.lacartedescolocs.fr' + new_result.href);
    }

    let data = JSON.stringify(result);
    fs.writeFileSync('results.json', data);

    browser.close();
};

async function current() {
    let rawdata = fs.readFileSync('results.json');
    let previous_results = JSON.parse(rawdata);

    const bot = new TelegramBot(TELEGRAM_BOT_ID);
    if (previous_results.length == 0) {
        bot.sendMessage(CHAT_ID, 'No results');
        return;
    }

    const new_result = previous_results[0]
    bot.sendMessage(CHAT_ID, 'Latest result is still:\n' + new_result.title + '\n http://www.lacartedescolocs.fr' + new_result.href);
}

(async () => {
        await check();
        cron.schedule("*/5 * * * *", async () => check());
        cron.schedule("0 9 * * *", async () => current());
})();


