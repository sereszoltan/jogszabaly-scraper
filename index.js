const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const { sendEmail } = require('./emailService');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
require('dotenv').config();


/*
const app = express();
const PORT = 3088;
app.use(express.json());

app.get('/laws', (req, res) => {
  const filePath = path.join(__dirname, 'laws.json');
  
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, 'utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.json(JSON.parse(data));
  } else {
    res.status(404).json({ error: 'Laws data not found' });
  }
});


app.post('/laws', (req, res) => {
  const data = req.body;

  if (!data || !Array.isArray(data.laws)) {
    return res.status(400).json({ message: '❌ A JSON nem tartalmaz érvényes laws tömböt!' });
  }

  try {
    fs.writeFileSync('laws.json', JSON.stringify(data, null, 2)); // nincs extra { laws }
    res.json({ message: '✅ Sikeresen mentve!' });
  } catch (err) {
    res.status(500).json({ message: '❌ Mentési hiba: ' + err.message });
  }
});

app.get('/editor', (req, res) => {
  res.sendFile(path.join(__dirname, 'editor.html'));
});


app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});


function extractHatalyosDate(html) {
  const $ = cheerio.load(html);
  const text = $('.hataly').text().trim();
  const match = text.match(/(\d{4})\.\s*(\d{2})\.\s*(\d{2})/);
  if (match) {
    const [ , year, month, day ] = match;
    return `${year}-${month}-${day}`;
  }
  return null;
}
*/

async function checkLawUpdates() {
  const laws = JSON.parse(fs.readFileSync('laws.json', 'utf-8')).laws;

  for (const law of laws) {
    try {
      const res = await axios.get(law.link);
      const currentHatalyos = extractHatalyosDate(res.data);

      if (currentHatalyos && currentHatalyos !== law.hatalyos) {
        console.log(`🔔 Változás észlelve a(z) "${law.title}" jogszabálynál!`);

        for (const recipient of law.ertesitendok) {
          const html = `<p>Tisztelt ${recipient.name},</p>
                        <p>A(z) <strong>${law.title}</strong> jogszabály hatályossága megváltozott.</p>
                        <p>Új hatályos dátum: <strong>${currentHatalyos}</strong></p>
                        <p>Link: <a href="${law.link}">${law.link}</a></p>`;
          await sendEmail(recipient.email, `Jogszabályváltozás: ${law.title}`, html);
          console.log(`✉️ E-mail elküldve: ${recipient.email}`);
        }

        law.hatalyos = currentHatalyos;
      }

    } catch (err) {
      console.error(`⚠️ Hiba a ${law.title} lekérdezésekor:`, err.message);
    }
  }

  fs.writeFileSync('laws.json', JSON.stringify({ laws }, null, 2));
}

checkLawUpdates();