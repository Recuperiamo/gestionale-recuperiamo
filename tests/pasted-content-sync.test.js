const puppeteer = require('puppeteer');

// Funzione di utilità per attendere un certo tempo
const delay = (ms) => new Promise(res => setTimeout(res, ms));

// URL della lavagna sandbox che non richiede autenticazione
const LAVAGNA_URL = 'http://localhost:3000/lavagna-sandbox';

// Dati di un'immagine di esempio (un piccolo PNG rosso in formato data URL)
const SAMPLE_IMAGE_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAHElEQVQ4T2P8z8AAROQDMBoGcUAANgMAlwQACPlh/xAAAAAASUVORK5CYII=';

describe('Sincronizzazione contenuti incollati e ridimensionamento sulla Lavagna', () => {
  let browser;
  let adminPage;
  let clientPage;

  beforeAll(async () => {
    // Nota: assicurati che il server di sviluppo sia già in esecuzione su localhost:3000
    // Prima di eseguire il test, lancia manualmente: npm run dev
    console.log('Connessione al server di sviluppo su http://localhost:3000...');
    console.log('Assicurati che il server sia già in esecuzione prima di eseguire questo test.');

    // Avvia Puppeteer
    browser = await puppeteer.launch({
      headless: true, // Usa modalità headless per evitare conflitti
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
      ],
    });

    // Crea due pagine, una per l'admin e una per il client
    adminPage = await browser.newPage();
    clientPage = await browser.newPage();

    // Vai alla pagina della lavagna per entrambi
    await adminPage.goto(LAVAGNA_URL, { waitUntil: 'networkidle2' });
    await clientPage.goto(LAVAGNA_URL, { waitUntil: 'networkidle2' });

    // Simula il ruolo: l'admin avrà `ruolo="admin"` nel contesto della pagina
    await adminPage.evaluate(() => {
      window.ruolo = 'admin';
    });
  }, 30000); // Timeout più lungo per beforeAll

  afterAll(async () => {
    if (adminPage) {
      await adminPage.close().catch(() => {});
    }
    if (clientPage) {
      await clientPage.close().catch(() => {});
    }
    if (browser) {
      await browser.close().catch(() => {});
    }
  }, 10000);

  test('Un\'immagine incollata dall\'admin dovrebbe apparire al client', async () => {
    // Simula l'incollamento di un'immagine sulla lavagna dell'admin
    await adminPage.evaluate(async (imageData) => {
      const blob = await (await fetch(imageData)).blob();
      const file = new File([blob], 'test.png', { type: 'image/png' });
      const clipboardData = new DataTransfer();
      clipboardData.items.add(file);
      const pasteEvent = new ClipboardEvent('paste', { clipboardData });
      window.dispatchEvent(pasteEvent);
    }, SAMPLE_IMAGE_DATA_URL);

    // Attendi un momento per la sincronizzazione
    await delay(2000);

    // Verifica che l'immagine sia apparsa sulla lavagna del client
    const clientImageSrc = await clientPage.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const ctx = canvas.getContext('2d');
      // Questo è un modo semplificato: in un'app reale, dovresti controllare lo stato interno
      // Qui cerchiamo una forma immagine nello stato delle forme
      const forme = window.forme; // Assumendo che 'forme' sia esposto globalmente per il test
      const imageShape = forme.find(f => f.kind === 'immagine');
      return imageShape ? imageShape.src : null;
    });

    // Ci aspettiamo che la sorgente dell'immagine sul client contenga la preview
    expect(clientImageSrc).toContain('data:image/jpeg;base64');
  }, 15000);

  test('Il ridimensionamento di un\'immagine da parte dell\'admin dovrebbe riflettersi sul client', async () => {
    // 1. Seleziona l'immagine sulla lavagna dell'admin
    await adminPage.evaluate(() => {
      const forme = window.forme;
      const imageShape = forme.find(f => f.kind === 'immagine');
      if (imageShape) {
        window.setSelectedItems({ tratti: [], forme: [imageShape.id] });
      }
    });
    await delay(500);

    // 2. Simula il drag del quadratino di ridimensionamento (es. bottom-right)
    const initialClientBounds = await clientPage.evaluate(() => {
        const forme = window.forme;
        const imageShape = forme.find(f => f.kind === 'immagine');
        return imageShape ? { w: imageShape.w, h: imageShape.h } : null;
    });

    await adminPage.evaluate(async () => {
        const forme = window.forme;
        const imageShape = forme.find(f => f.kind === 'immagine');
        if (imageShape) {
            const bounds = window.getShapeBounds(imageShape);
            const handlePos = { x: bounds.maxX, y: bounds.maxY }; // bottom-right
            
            // Simula il mouse down sul quadratino
            window.pointerDown({ nativeEvent: { clientX: handlePos.x, clientY: handlePos.y, pointerId: 1 } });
            await new Promise(r => setTimeout(r, 100));

            // Simula il movimento del mouse per ridimensionare
            window.pointerMove({ nativeEvent: { clientX: handlePos.x + 50, clientY: handlePos.y + 50, pointerId: 1 } });
            await new Promise(r => setTimeout(r, 100));

            // Simula il rilascio del mouse
            window.pointerUp({ nativeEvent: { pointerId: 1 } });
        }
    });

    await delay(2000);

    // 3. Verifica che le dimensioni dell'immagine siano cambiate sul client
    const finalClientBounds = await clientPage.evaluate(() => {
        const forme = window.forme;
        const imageShape = forme.find(f => f.kind === 'immagine');
        return imageShape ? { w: imageShape.w, h: imageShape.h } : null;
    });

    expect(finalClientBounds).not.toBeNull();
    expect(initialClientBounds).not.toBeNull();
    expect(finalClientBounds.w).toBeGreaterThan(initialClientBounds.w);
    expect(finalClientBounds.h).toBeGreaterThan(initialClientBounds.h);
  }, 20000);
});
