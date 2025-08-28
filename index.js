const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

class WikipediaCrawler {
    constructor() {
        this.wikipediaLanguages = [
            'aa', 'ab', 'ae', 'af', 'ak', 'am', 'an', 'ar', 'as', 'av', 'ay', 'az',
            'ba', 'be', 'bg', 'bh', 'bi', 'bm', 'bn', 'bo', 'br', 'bs',
            'ca', 'ce', 'ch', 'co', 'cr', 'cs', 'cu', 'cv', 'cy',
            'da', 'de', 'dv', 'dz',
            'ee', 'el', 'en', 'eo', 'es', 'et', 'eu',
            'fa', 'ff', 'fi', 'fj', 'fo', 'fr', 'fy',
            'ga', 'gd', 'gl', 'gn', 'gu', 'gv',
            'ha', 'he', 'hi', 'ho', 'hr', 'ht', 'hu', 'hy', 'hz',
            'ia', 'id', 'ie', 'ig', 'ii', 'ik', 'io', 'is', 'it', 'iu',
            'ja', 'jv',
            'ka', 'kg', 'ki', 'kj', 'kk', 'kl', 'km', 'kn', 'ko', 'kr', 'ks', 'ku', 'kv', 'kw', 'ky',
            'la', 'lb', 'lg', 'li', 'ln', 'lo', 'lt', 'lu', 'lv',
            'mg', 'mh', 'mi', 'mk', 'ml', 'mn', 'mr', 'ms', 'mt', 'my',
            'na', 'nb', 'nd', 'ne', 'ng', 'nl', 'nn', 'no', 'nr', 'nv', 'ny',
            'oc', 'oj', 'om', 'or', 'os',
            'pa', 'pi', 'pl', 'ps', 'pt',
            'qu',
            'rm', 'rn', 'ro', 'ru', 'rw',
            'sa', 'sc', 'sd', 'se', 'sg', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sq', 'sr', 'ss', 'st', 'su', 'sv', 'sw',
            'ta', 'te', 'tg', 'th', 'ti', 'tk', 'tl', 'tn', 'to', 'tr', 'ts', 'tt', 'tw', 'ty',
            'ug', 'uk', 'ur', 'uz',
            've', 'vi', 'vo',
            'wa', 'wo',
            'xh',
            'yi', 'yo',
            'za', 'zh', 'zu',
        ];
        this.currentLanguage = 'fr';
        this.baseUrl = `https://${this.currentLanguage}.wikipedia.org`;
        this.databaseFile = 'database.json';
        this.requestDelay = 2000;
        this.maxRetries = 3;
        this.visitedUrls = new Set();
        this.pendingLinks = [];
        this.isActive = false;
        this.metrics = {
            totalPages: 0,
            totalLinks: 0,
            errorCount: 0,
            languageStats: {},
            startTime: null,
            lastUpdate: null
        };
        
        this.startingUrls = this.generateStartingUrls();
    }

    generateStartingUrls() {
        const urls = [];
        this.wikipediaLanguages.forEach(lang => {
            urls.push(`https://${lang}.wikipedia.org/wiki/Main_Page`);
            urls.push(`https://${lang}.wikipedia.org/wiki/Portal:Contents`);
            urls.push(`https://${lang}.wikipedia.org/wiki/Special:Random`);
        });
        return urls;
    }

    detectLanguageFromUrl(url) {
        const match = url.match(/https:\/\/(\w+)\.wikipedia\.org/);
        return match ? match[1] : 'unknown';
    }

    updateBaseUrl(language) {
        this.currentLanguage = language;
        this.baseUrl = `https://${language}.wikipedia.org`;
    }

    initializeDatabase() {
        const dbPath = path.join(__dirname, this.databaseFile);
        
        if (fs.existsSync(dbPath)) {
            try {
                const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
                console.log(`Base de données chargée: ${data.pages ? data.pages.length : 0} pages`);
                
                if (data.pages) {
                    data.pages.forEach(page => {
                        if (page.url) {
                            this.visitedUrls.add(page.url);
                        }
                    });
                }
                
                if (data.statistics) {
                    this.metrics = { ...this.metrics, ...data.statistics };
                }
                
                return data;
            } catch (error) {
                console.error('Erreur lors du chargement de la base de données :', error.message);
                return this.createEmptyDatabase();
            }
        } else {
            console.log('Création d\'une nouvelle base de données');
            return this.createEmptyDatabase();
        }
    }

    createEmptyDatabase() {
        const languageStats = {};
        this.wikipediaLanguages.forEach(lang => {
            languageStats[lang] = { pages: 0, links: 0 };
        });
        
        return {
            metadata: {
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                version: '1.0.0',
                supportedLanguages: this.wikipediaLanguages
            },
            statistics: {
                ...this.metrics,
                languageStats: languageStats
            },
            pages: [],
            linkQueue: []
        };
    }

    saveDatabase(database) {
        try {
            database.metadata.lastUpdated = new Date().toISOString();
            database.statistics = this.metrics;
            database.linkQueue = this.pendingLinks.slice(0, 1000);
            
            const dbPath = path.join(__dirname, this.databaseFile);
            fs.writeFileSync(dbPath, JSON.stringify(database, null, 2), 'utf8');
            
            console.log(`Base de données sauvegardée: ${database.pages.length} pages`);
        } catch (error) {
            console.error('Erreur de sauvegarde :', error.message);
        }
    }

    async fetchPage(url) {
        let attempts = 0;
        
        while (attempts < this.maxRetries) {
            try {
                console.log(`Récupération [${attempts + 1}]: ${url}`);
                
                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Connection': 'keep-alive'
                    },
                    timeout: 15000,
                    maxRedirects: 5
                });
                
                return response.data;
            } catch (error) {
                attempts++;
                console.error(`Erreur (${attempts}/${this.maxRetries}):`, error.message);
                
                if (attempts >= this.maxRetries) {
                    throw error;
                }
                
                await this.sleep(this.requestDelay * attempts);
            }
        }
    }

    extractPageData(html, url) {
        const $ = cheerio.load(html);
        const language = this.detectLanguageFromUrl(url);
        
        const title = $('#firstHeading').text().trim() || 
                     $('.mw-page-title-main').text().trim() || 
                     $('h1').first().text().trim() || 
                     $('title').text().split(' - ')[0].trim();
        
        const contentParagraphs = [];
        $('#mw-content-text .mw-parser-output p, .mw-content-ltr p, .mw-content p').each((i, elem) => {
            if (i < 3) {
                const text = $(elem).text().trim();
                if (text.length > 50) {
                    contentParagraphs.push(text);
                }
            }
        });
        
        const categories = [];
        $('#mw-normal-catlinks ul li a, .catlinks ul li a').each((i, elem) => {
            if (i < 10) {
                const categoryText = $(elem).text().trim();
                if (categoryText) {
                    categories.push(categoryText);
                }
            }
        });
        
        const internalLinks = [];
        $('a[href^="/wiki/"]').each((i, elem) => {
            if (i < 25) {
                const href = $(elem).attr('href');
                const linkText = $(elem).text().trim();
                
                if (href && linkText && 
                    !href.includes(':') && 
                    !href.includes('#') &&
                    linkText.length > 2 &&
                    !href.includes('Special:') &&
                    !href.includes('File:') &&
                    !href.includes('Category:')) {
                    
                    const fullUrl = `https://${language}.wikipedia.org${href}`;
                    internalLinks.push({
                        href: href,
                        text: linkText,
                        fullUrl: fullUrl,
                        language: language
                    });
                    
                    if (!this.visitedUrls.has(fullUrl) && 
                        !this.pendingLinks.some(link => link.url === fullUrl)) {
                        this.pendingLinks.push({
                            url: fullUrl,
                            text: linkText,
                            language: language,
                            addedAt: new Date().toISOString()
                        });
                    }
                }
            }
        });
        
        const coordinates = $('.geo-dec, .geo').text().trim() || null;
        
        const infobox = {};
        $('.infobox tr, .infobox-row').each((i, elem) => {
            if (i < 10) {
                const key = $(elem).find('th, .infobox-label').text().trim();
                const value = $(elem).find('td, .infobox-data').text().trim();
                if (key && value && key.length < 100 && value.length < 300) {
                    infobox[key] = value;
                }
            }
        });
        
        const interlanguageLinks = [];
        $('.interlanguage-link a, #p-lang a').each((i, elem) => {
            if (i < 10) {
                const href = $(elem).attr('href');
                const langText = $(elem).text().trim();
                if (href && langText) {
                    interlanguageLinks.push({
                        url: href,
                        language: langText,
                        detected: this.detectLanguageFromUrl(href)
                    });
                    
                    if (!this.visitedUrls.has(href) && 
                        !this.pendingLinks.some(link => link.url === href)) {
                        this.pendingLinks.push({
                            url: href,
                            text: langText,
                            language: this.detectLanguageFromUrl(href),
                            addedAt: new Date().toISOString()
                        });
                    }
                }
            }
        });
        
        return {
            url: url,
            language: language,
            title: title,
            content: contentParagraphs.join('\n\n').substring(0, 2000),
            categories: categories,
            coordinates: coordinates,
            infobox: infobox,
            internalLinks: internalLinks,
            interlanguageLinks: interlanguageLinks,
            crawledAt: new Date().toISOString(),
            contentLength: contentParagraphs.join('').length,
            linkCount: internalLinks.length + interlanguageLinks.length
        };
    }

    isValidWikipediaArticle(url) {
        return url.includes('.wikipedia.org/wiki/') &&
               !url.includes('Special:') &&
               !url.includes('Help:') &&
               !url.includes('Wikipedia:') &&
               !url.includes('Portal:') &&
               !url.includes('Category:') &&
               !url.includes('File:') &&
               !url.includes('Template:') &&
               !url.includes('Talk:') &&
               !url.includes('User:') &&
               !url.includes('#');
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    displayStatistics() {
        const runtime = this.metrics.startTime ? 
            Math.floor((Date.now() - new Date(this.metrics.startTime).getTime()) / 1000) : 0;
        
        console.log('\n=== STATS ===');
        console.log(`Temps d'exécution: ${Math.floor(runtime / 3600)}h ${Math.floor((runtime % 3600) / 60)}m ${runtime % 60}s`);
        console.log(`Pages crawlées: ${this.metrics.totalPages}`);
        console.log(`Liens trouvés: ${this.metrics.totalLinks}`);
        console.log(`Liens en attente: ${this.pendingLinks.length}`);
        console.log(`Erreurs: ${this.metrics.errorCount}`);
        console.log(`Dernière mise à jour: ${this.metrics.lastUpdate || 'Aucune'}`);
        
        if (this.metrics.languageStats) {
            console.log('\nStatistiques par langue:');
            Object.entries(this.metrics.languageStats)
                .sort(([,a], [,b]) => b.pages - a.pages)
                .slice(0, 10)
                .forEach(([lang, stats]) => {
                    if (stats.pages > 0) {
                        console.log(`  ${lang}: ${stats.pages} pages, ${stats.links} liens`);
                    }
                });
        }
        
        console.log('==================================\n');
    }

    async startContinuousCrawling() {
        console.log('=== DÉMARRAGE DU CRAWLER WIKIPEDIA MULTILINGUE ===');
        
        this.isActive = true;
        this.metrics.startTime = new Date().toISOString();
        
        let database = this.initializeDatabase();
        
        if (this.pendingLinks.length === 0) {
            this.startingUrls.forEach(url => {
                if (!this.visitedUrls.has(url)) {
                    this.pendingLinks.push({
                        url: url,
                        text: 'Page de démarrage',
                        language: this.detectLanguageFromUrl(url),
                        addedAt: new Date().toISOString()
                    });
                }
            });
        }
        
        if (database.linkQueue && database.linkQueue.length > 0) {
            this.pendingLinks.push(...database.linkQueue);
        }
        
        console.log(`Queue initialisée avec ${this.pendingLinks.length} liens`);
        
        let consecutiveErrors = 0;
        const maxConsecutiveErrors = 10;
        
        while (this.isActive) {
            try {
                if (this.pendingLinks.length === 0) {
                    console.log('Queue vide, ajout d\'URLs de démarrage...');
                    this.startingUrls.forEach(url => {
                        if (!this.visitedUrls.has(url)) {
                            this.pendingLinks.push({
                                url: url,
                                text: 'Redémarrage',
                                language: this.detectLanguageFromUrl(url),
                                addedAt: new Date().toISOString()
                            });
                        }
                    });
                    
                    if (this.pendingLinks.length === 0) {
                        console.log('Aucun nouveau lien, attente de 30 secondes...');
                        await this.sleep(30000);
                        continue;
                    }
                }
                
                const nextLink = this.pendingLinks.shift();
                const url = nextLink.url;
                const language = nextLink.language || this.detectLanguageFromUrl(url);
                
                if (this.visitedUrls.has(url)) {
                    continue;
                }
                
                if (!this.isValidWikipediaArticle(url)) {
                    continue;
                }
                
                console.log(`\nCrawling *[${language}]: ${nextLink.text}`);
                console.log(`URL: ${url}`);
                
                const html = await this.fetchPage(url);
                const pageData = this.extractPageData(html, url);
                
                database.pages.push(pageData);
                this.visitedUrls.add(url);
                
                this.metrics.totalPages++;
                this.metrics.totalLinks += pageData.linkCount;
                this.metrics.lastUpdate = new Date().toISOString();
                
                if (!this.metrics.languageStats[language]) {
                    this.metrics.languageStats[language] = { pages: 0, links: 0 };
                }
                this.metrics.languageStats[language].pages++;
                this.metrics.languageStats[language].links += pageData.linkCount;
                
                console.log(`Page crawlée: "${pageData.title}"`);
                console.log(`${pageData.linkCount} nouveaux liens ajoutés à la queue`);
                
                if (this.metrics.totalPages % 10 === 0) {
                    this.saveDatabase(database);
                    this.displayStatistics();
                }
                
                consecutiveErrors = 0;
                
            } catch (error) {
                this.metrics.errorCount++;
                consecutiveErrors++;
                
                console.error(`Erreur lors du crawling :`, error.message);
                
                if (consecutiveErrors >= maxConsecutiveErrors) {
                    console.log(`Trop d'erreurs consécutives (${consecutiveErrors}), pause de 5 minutes...`);
                    await this.sleep(300000);
                    consecutiveErrors = 0;
                }
            }
            
            console.log(`Attente de ${this.requestDelay}ms...`);
            await this.sleep(this.requestDelay);
        }
    }

    stop() {
        console.log('Arrêt du crawler...');
        this.isActive = false;
    }
}

process.on('SIGINT', () => {
    console.log('Arret');
    if (global.crawler) {
        global.crawler.stop();
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Termine');
    if (global.crawler) {
        global.crawler.stop();
    }
    process.exit(0);
});

async function main() {
    const crawler = new WikipediaCrawler();
    global.crawler = crawler;
    
    try {
        await crawler.startContinuousCrawling();
    } catch (error) {
        console.error('Erreur :', error.message);
        console.log('Redémarrage automatique dans 10 secondes.');
        
        setTimeout(() => {
            console.log('Redémarrage du crawler');
            main();
        }, 10000);
    }
}

if (require.main === module) {
    main();
}

module.exports = WikipediaCrawler;