import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import {exec} from 'child_process';
import fs from 'fs';

function pythonApiPlugin(): Plugin {
  return {
    name: 'python-api-plugin',
    configureServer(server) {
      server.middlewares.use('/api/run-tests', (req, res) => {
        exec(
          'python3 -m unittest discover -s library_agent/tests -p "test_*.py" -v',
          {cwd: process.cwd()},
          (error, stdout, stderr) => {
            const output = (stdout || '') + (stderr || '');
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                success: !error,
                exitCode: error ? error.code : 0,
                output: output.trim(),
              })
            );
          }
        );
      });

      server.middlewares.use('/api/python-files', (req, res) => {
        const fileList = [
          'library_agent/app.py',
          'library_agent/graph_model.py',
          'library_agent/search.py',
          'library_agent/multi_book.py',
          'library_agent/data/library.json',
          'library_agent/tests/test_search.py',
          'library_agent/README.md',
          'requirements.txt',
        ];

        const filesData: Record<string, string> = {};
        for (const f of fileList) {
          const fullPath = path.resolve(process.cwd(), f);
          if (fs.existsSync(fullPath)) {
            filesData[f] = fs.readFileSync(fullPath, 'utf-8');
          }
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(filesData));
      });

      server.middlewares.use('/api/download-viva-pdf', (req, res) => {
        const pdfFile = path.resolve(process.cwd(), 'public/The_Alexandria_Codex_Viva_Voce_and_System_Dossier.pdf');
        if (fs.existsSync(pdfFile)) {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'attachment; filename="The_Alexandria_Codex_Viva_Voce_and_System_Dossier.pdf"');
          fs.createReadStream(pdfFile).pipe(res);
        } else {
          res.statusCode = 404;
          res.end('PDF not found');
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), pythonApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
