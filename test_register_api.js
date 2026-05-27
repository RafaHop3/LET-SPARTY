const http = require('http');

function makeRequest(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body });
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('--- Iniciando Testes ---');

  // Teste 1: Festeiro
  try {
    console.log('\nTeste 1: Registrando Festeiro');
    const res1 = await makeRequest({
      role: 'FESTEIRO',
      name: 'João QA',
      email: 'joao.qa@test.com',
      password: 'senha-segura-123',
      cpf: '111.222.333-44',
    });
    console.log(`Status: ${res1.statusCode}`);
    console.log(`Body: ${res1.body}`);
  } catch (e) {
    console.error('Erro no Teste 1:', e.message);
  }

  // Teste 2: Produtora
  try {
    console.log('\nTeste 2: Registrando Produtora');
    const res2 = await makeRequest({
      role: 'PRODUTORA',
      name: 'Maria QA',
      email: 'maria.qa@test.com',
      password: 'senha-segura-123',
      cnpj: '12.345.678/0001-99',
      companyName: 'QA Eventos',
    });
    console.log(`Status: ${res2.statusCode}`);
    console.log(`Body: ${res2.body}`);
  } catch (e) {
    console.error('Erro no Teste 2:', e.message);
  }

  // Teste 3: Duplicate Email
  try {
    console.log('\nTeste 3: Registrando Festeiro com email duplicado');
    const res3 = await makeRequest({
      role: 'FESTEIRO',
      name: 'João QA Duplicado',
      email: 'joao.qa@test.com',
      password: 'senha-segura-123',
      cpf: '222.333.444-55',
    });
    console.log(`Status: ${res3.statusCode}`);
    console.log(`Body: ${res3.body}`);
  } catch (e) {
    console.error('Erro no Teste 3:', e.message);
  }
}

runTests();
