import React, { useState, useCallback, useEffect } from 'react';
import { useTheme } from 'next-themes';
import DataUploader from '@/components/DataUploader';
import GameControls from '@/components/GameControls';
import GameBoard from '@/components/GameBoard';
import LogDisplay from '@/components/LogDisplay';
import NeuralNetworkVisualization from '@/components/NeuralNetworkVisualization';
import { Progress } from "@/components/ui/progress";
import { useGameLogic } from '@/hooks/useGameLogic';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { showToast, loadCSV, loadModel } from '@/utils/gameUtils';

const PlayPage: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [csvData, setCsvData] = useState<number[][]>([]);
  const [csvDates, setCsvDates] = useState<Date[]>([]);
  const [trainedModel, setTrainedModel] = useState<any>(null);
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

  const handleLoadCSV = useCallback((file: File) => {
    loadCSV(file, setCsvData, setCsvDates, addLog);
  }, [addLog]);

  const handleLoadModel = useCallback((jsonFile: File, weightsFile: File) => {
    loadModel(jsonFile, weightsFile, setTrainedModel, addLog);
  }, [addLog]);

  const playGame = useCallback(() => {
    if (!trainedModel || csvData.length === 0) {
      addLog("Não é possível iniciar o jogo. Verifique se o modelo e os dados CSV foram carregados.");
      showToast("Não é possível iniciar", "Verifique se o modelo e os dados CSV foram carregados.", "destructive");
      return;
    }
    setIsPlaying(true);
    addLog("Jogo iniciado.");
    showToast("Jogo Iniciado", "O jogo foi iniciado com sucesso.");
  }, [trainedModel, csvData, addLog]);

  const pauseGame = useCallback(() => {
    setIsPlaying(false);
    addLog("Jogo pausado.");
    showToast("Jogo Pausado", "O jogo foi pausado.");
  }, [addLog]);

  const resetGame = useCallback(() => {
    setIsPlaying(false);
    setProgress(0);
    initializePlayers();
    setLogs([]);
    addLog("Jogo reiniciado.");
    showToast("Jogo Reiniciado", "O jogo foi reiniciado com sucesso.");
  }, [initializePlayers, addLog]);

  const toggleInfiniteMode = useCallback(() => {
    setIsInfiniteMode(prev => !prev);
    addLog(`Modo infinito ${isInfiniteMode ? 'desativado' : 'ativado'}.`);
    showToast(`Modo Infinito ${isInfiniteMode ? 'Desativado' : 'Ativado'}`, `O modo infinito foi ${isInfiniteMode ? 'desativado' : 'ativado'}.`);
  }, [isInfiniteMode, setIsInfiniteMode, addLog]);

  useEffect(() => {
    if (isPlaying) {
      const intervalId = setInterval(() => {
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
      return () => clearInterval(intervalId);
    }
  }, [isPlaying, csvData, gameLoop, evolveGeneration, isInfiniteMode]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4 neon-title">SHERLOK</h2>
      
      <div className="flex flex-wrap gap-4">
        <div className="flex-1">
          <DataUploader onCsvUpload={handleLoadCSV} onModelUpload={handleLoadModel} />

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