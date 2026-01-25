import * as readline from 'readline';
import { ChatAssistant } from './assistant';

const assistant = new ChatAssistant();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║         CODE CLOUD AGENTS - Chat Interface                 ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');
console.log('🤖 Hallo! Beschreibe was du bauen möchtest.');
console.log('   Tippe "exit" zum Beenden, "reset" für neuen Chat.');
console.log('');

const prompt = () => {
  rl.question('Du: ', async (input) => {
    const trimmed = input.trim();

    if (!trimmed) {
      prompt();
      return;
    }

    if (trimmed.toLowerCase() === 'exit') {
      console.log('\n👋 Bis bald!\n');
      rl.close();
      process.exit(0);
    }

    if (trimmed.toLowerCase() === 'reset') {
      assistant.reset();
      console.log('\n🔄 Chat zurückgesetzt.\n');
      prompt();
      return;
    }

    try {
      console.log('');
      const response = await assistant.process(trimmed);
      console.log(`🤖 ${response}`);
      console.log('');
    } catch (error: any) {
      console.log(`\n❌ Fehler: ${error.message}\n`);
    }

    prompt();
  });
};

prompt();
