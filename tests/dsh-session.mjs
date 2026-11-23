// Inspect the real headless transport using a synthetic project and a loopback responder.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { promisify } from 'node:util';

const execute = promisify(execFile);
const reply = 'DSH_WORKFLOW_SMOKE_OK';

function streamResponse(response, model) {
  const events = [
    { type: 'message_start', message: { id: 'fixture', type: 'message', role: 'assistant',
      model, content: [], usage: { input_tokens: 1, output_tokens: 0 } } },
    { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: reply } },
    { type: 'content_block_stop', index: 0 },
    { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 1 } },
    { type: 'message_stop' }
  ];
  response.writeHead(200, { 'Content-Type': 'text/event-stream' });
  for (const event of events) response.write('event: ' + event.type + '\ndata: ' + JSON.stringify(event) + '\n\n');
  response.end();
}

export async function checkSession({ cli, cwd, env, skills, skillName, skillBody, globalText, projectText }) {
  const taskText = '/' + skillName + ' Inspect the synthetic fixture.';
  const requests = [];
  const server = createServer(async (request, response) => {
    try {
      let body = '';
      for await (const chunk of request) body += chunk;
      const parsed = JSON.parse(body);
      requests.push(parsed.messages);
      streamResponse(response, parsed.model);
    } catch {
      response.writeHead(400).end();
    }
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const { stdout } = await execute(process.execPath, [cli, '--profile', 'headless', taskText], {
      cwd, timeout: 60000, env: { ...env, CI: 'true', DSH_TELEMETRY_DISABLED: '1',
        DEEPSEEK_BASE_URL: 'http://127.0.0.1:' + server.address().port,
        DEEPSEEK_API_KEY: 'local-fixture-only' }
    });
    assert.equal(stdout.trim(), reply);
    const task = requests.flat().find(message => Array.isArray(message?.content)
      && message.content.some(part => part.text === taskText));
    assert.ok(task, 'headless task reached the loopback responder');
    const prompt = task.content.map(part => part.text).join('\n');
    assert.ok(prompt.includes(globalText) && prompt.includes(projectText), 'both instruction layers reach the provider');
    const catalog = prompt.match(/<available_skills>([\s\S]*?)<\/available_skills>/)?.[1];
    assert.ok(catalog, 'skill catalog is present');
    for (const name of skills) assert.ok(catalog.includes('`' + name + '`'), name + ' in catalog');
    const invoked = [...prompt.matchAll(/<skill_content name="([^"]+)">([\s\S]*?)<\/skill_content>/g)];
    assert.deepEqual(invoked.map(match => match[1]), [skillName], 'only the requested skill is invoked');
    assert.ok(invoked[0][2].includes(skillBody), 'direct /' + skillName + ' input injects the complete skill body');
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}
