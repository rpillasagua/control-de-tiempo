'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';

export default function DriveDiagnostic() {
    const [logs, setLogs] = useState<string[]>([]);
    const [config, setConfig] = useState<any>({});

    const addLog = (msg: string) => {
        setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
        console.log(`[DriveDiagnostic] ${msg}`);
    };

    useEffect(() => {
        const runDiagnostic = async () => {
            addLog('🚀 Iniciando diagnóstico de Google Drive...');

            // 1. Check Config
            const driveConfig = {
                apiKey: process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY ? '✅ Configurado' : '❌ Faltante',
                clientId: process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID ? '✅ Configurado' : '❌ Faltante',
                rootFolderId: process.env.NEXT_PUBLIC_GOOGLE_DRIVE_ROOT_FOLDER_ID || '(No configurado, usará búsqueda automática)',
            };
            setConfig(driveConfig);
            addLog(`Configuración: ${JSON.stringify(driveConfig, null, 2)}`);

            try {
                // 2. Import Service
                addLog('Importando googleDriveService...');
                const { googleDriveService } = await import('@/lib/googleDriveService');

                // 3. Initialize
                addLog('Inicializando servicio...');
                await googleDriveService.initialize();
                addLog('✅ Servicio inicializado');

                // 4. Check Root Folder
                // @ts-ignore - accessing private property for diagnostic
                const rootId = googleDriveService.rootFolderId;
                addLog(`📂 Root Folder ID en uso: ${rootId}`);

                if (rootId) {
                    addLog('Verificando contenido de carpeta raíz...');
                    // @ts-ignore
                    const folderName = await googleDriveService.getFile(rootId).then((f: any) => f.name).catch((e: any) => `Error: ${e.message}`);
                    addLog(`Nombre de carpeta raíz: ${folderName}`);
                }

            } catch (error: any) {
                addLog(`❌ ERROR CRÍTICO: ${error.message}`);
                console.error(error);
            }
        };

        runDiagnostic();
    }, []);

    return (
        <Card className="m-4">
            <CardHeader>
                <CardTitle>Diagnóstico de Google Drive</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="bg-slate-950 text-green-400 p-4 rounded-lg font-mono text-xs h-96 overflow-y-auto">
                    {logs.map((log, i) => (
                        <div key={i} className="mb-1 border-b border-slate-800 pb-1">{log}</div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
