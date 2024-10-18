import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import * as tf from '@tensorflow/tfjs';
import DataUploader from '@/components/DataUploader';
import GameControls from '@/components/GameControls';
import GameBoard from '@/components/GameBoard';
import LogDisplay from '@/components/LogDisplay';
import NeuralNetworkVisualization from '@/components/NeuralNetworkVisualization';
import { Progress } from "@/components/ui/progress";
import { useGameLogic } from '@/hooks/useGameLogic';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const PlayPage: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [csvData, setCsvData] = useState<number[][]>([]);
  const [csvDates, setCsvDates] = useState<Date[]>([]);
  const [trainedModel, setTrainedModel] = useState<tf.LayersModel | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const { theme, setTheme } = useTheme();

  const {
    players,
    generation,
    evolutionData,
    boardNumbers,
    concursoNumber,
    isInfiniteMode,
    setIsInfiniteMode,
    initializePlayers,
    gameLoop,
    evolveGeneration,
    neuralNetworkVisualization
  } = useGameLogic(csvData, trainedModel);

  const addLog = useCallback((message: string) => {
    setLogs(prevLogs => [...prevLogs, message]);
  }, []);

  const loadCSV = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.trim().split('\n').slice(1); // Ignorar o cabeçalho
      const data = lines.map(line => {
        const values = line.split(',');
        return {
          concurso: parseInt(values[0], 10),
          data: new Date(values[1].split('/').reverse().join('-')),
          bolas: values.slice(2).map(Number)
        };
      });
      setCsvData(data.map(d => d.bolas));
      setCsvDates(data.map(d => d.data));
      addLog("CSV carregado e processado com sucesso!");
      addLog(`Número de registros carregados: ${data.length}`);
    } catch (error) {
      addLog(`Erro ao carregar CSV: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const loadModel = async (jsonFile: File, weightsFile: File) => {
    try {
      const model = await tf.loadLayersModel(tf.io.browserFiles([jsonFile, weightsFile]));
      setTrainedModel(model);
      addLog("Modelo carregado com sucesso!");
    } catch (error) {
      addLog(`Erro ao carregar o modelo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      console.error("Detalhes do erro:", error);
    }
  };

  const playGame = useCallback(() => {
    if (!trainedModel || csvData.length === 0) {
      addLog("Não é possível iniciar o jogo. Verifique se o modelo e os dados CSV foram carregados.");
      return;
    }
    setIsPlaying(true);
    addLog("Jogo iniciado.");
    gameLoop();
  }, [trainedModel, csvData, gameLoop, addLog]);

  const pauseGame = () => {
    setIsPlaying(false);
    addLog("Jogo pausado.");
  };

  const resetGame = () => {
    setIsPlaying(false);
    setProgress(0);
    initializePlayers();
    setLogs([]);
    addLog("Jogo reiniciado.");
  };

  const toggleInfiniteMode = () => {
    setIsInfiniteMode(!isInfiniteMode);
    addLog(`Modo infinito ${!isInfiniteMode ? 'ativado' : 'desativado'}.`);
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isPlaying) {
      intervalId = setInterval(() => {
        gameLoop();
        setProgress((prevProgress) => {
          const newProgress = prevProgress + (100 / csvData.length);
          if (newProgress >= 100) {
            evolveGeneration();
            return isInfiniteMode ? 0 : 100;
          }
          return newProgress;
        });
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [isPlaying, csvData, gameLoop, evolveGeneration, isInfiniteMode]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4 neon-title">SHERLOK</h2>
      
      <div className="flex flex-wrap gap-4">
        <div className="flex-1">
          <DataUploader onCsvUpload={loadCSV} onModelUpload={loadModel} />

          <GameControls
            isPlaying={isPlaying}
            onPlay={playGame}
            onPause={pauseGame}
            onReset={resetGame}
            onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          />

          <Button onClick={toggleInfiniteMode} className="mt-2">
            {isInfiniteMode ? 'Desativar' : 'Ativar'} Modo Infinito
          </Button>

          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Progresso da Geração {generation}</h3>
            <Progress value={progress} className="w-full" />
          </div>

          <GameBoard
            boardNumbers={boardNumbers}
            concursoNumber={concursoNumber}
            players={players}
            evolutionData={evolutionData}
          />
          
          <LogDisplay logs={logs} />
        </div>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Visualização da Rede Neural</CardTitle>
          </CardHeader>
          <CardContent>
            {neuralNetworkVisualization ? (
              <NeuralNetworkVisualization
                input={neuralNetworkVisualization.input}
                output={neuralNetworkVisualization.output}
                weights={neuralNetworkVisualization.weights}
              />
            ) : (
              <p>Aguardando dados da rede neural...</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlayPage;
