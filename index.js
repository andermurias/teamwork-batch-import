const csv = require('csv-parser');
const fs = require('fs');
const axios = require('axios');
const moment = require('moment');

const connection = require('./connection.json');
const {request} = require('http');

const token = Buffer.from(connection.username + ':' + connection.password).toString('base64');

const dir = './csv';

fs.readdir(dir, (err, files) => {
  files.forEach(async (file) => {
    await submitCsv(dir + '/' + file);
  });
});

const submitCsv = (filename) =>
  new Promise((resolve, reject) => {
    const requests = [];

    fs.createReadStream(filename)
      .pipe(csv())
      .on('data', async (task) => {
        const start = moment(task.start, 'HH:mm');
        const end = moment(task.end, 'HH:mm');
        const date = moment(task.date, 'YYYYY-MM-DD');

        const diff = moment.duration(end.diff(start));

        requests.push({
          'time-entry': {
            description: task.description.replace(/[^a-z0-9\s\-_]/gi, ''),
            date: date.format('YYYYMMDD'),
            time: task.start,
            hours: diff.hours(),
            minutes: diff.minutes(),
          },
        });
        console.log(task);
      })
      .on('end', async () => {
        await Promise.all(
          requests.map((payload) =>
            axios.post(`https://${connection.domain}/projects/${connection.projectId}/time_entries.json`, payload, {
              headers: {
                Authorization: `Basic ${token}`,
              },
            }),
          ),
        );
        console.log('CSV file successfully processed');
        resolve();
      });
  });
