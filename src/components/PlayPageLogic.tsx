import React, { useState, useEffect, useCallback } from 'react';
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
import { Save, Upload } from 'lucide-react';

interface PlayPageLogicProps {
  toast: (props: any) => void;
  theme: string;
  setTheme: (theme: string) => void;
}

export const PlayPageLogic: React.FC<PlayPageLogicProps> = ({ toast, theme, setTheme }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [csvData, setCsvData] = useState<number[][]>([]);
  const [csvDates, setCsvDates] = useState<Date[]>([]);
  const [trainedModel, setTrainedModel] = useState<tf.LayersModel | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const {
    players,
    generation,
    evolutionData,
    boardNumbers,
    concursoNumber,
    isInfiniteMode,
    setIsInfiniteMode,
    gameLoop,
    evolveGeneration,
    neuralNetworkVisualization,
    bestPlayer,
    cloneBestPlayer,
    saveModel,
    loadModel
  } = useGameLogic(csvData, trainedModel);

  const addLog = useCallback((message: string) => {
    setLogs(prevLogs => [...prevLogs, message]);
  }, []);

  const loadCSV = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.trim().split('\n').slice(1);
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
      toast({
        title: "CSV Carregado",
        description: `${data.length} registros processados com sucesso.`,
      });
    } catch (error) {
      addLog(`Erro ao carregar CSV: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      toast({
        title: "Erro ao carregar CSV",
        description: "Ocorreu um erro ao processar o arquivo.",
        variant: "destructive"
      });
    }
  };

  const loadModelFile = async (file: File) => {
    try {
      await loadModel(file);
      addLog("Modelo Sherlok carregado com sucesso!");
      toast({
        title: "Modelo Carregado",
        description: "O modelo Sherlok foi carregado com sucesso.",
      });
    } catch (error) {
      addLog(`Erro ao carregar o modelo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      toast({
        title: "Erro ao carregar modelo",
        description: "Ocorreu um erro ao carregar o modelo Sherlok.",
        variant: "destructive"
      });
    }
  };

  const playGame = useCallback(() => {
    if (csvData.length === 0) {
      addLog("Não é possível iniciar o jogo. Verifique se os dados CSV foram carregados.");
      toast({
        title: "Erro ao iniciar o jogo",
        description: "Carregue os dados CSV antes de iniciar.",
        variant: "destructive"
      });
      return;
    }
    setIsPlaying(true);
    addLog("Jogo iniciado.");
    toast({
      title: "Jogo Iniciado",
      description: "O jogo foi iniciado com sucesso.",
    });
  }, [csvData, addLog, toast]);

  const pauseGame = () => {
    setIsPlaying(false);
    addLog("Jogo pausado.");
    toast({
      title: "Jogo Pausado",
      description: "O jogo foi pausado.",
    });
  };

  const resetGame = () => {
    setIsPlaying(false);
    setProgress(0);
    setLogs([]);
    addLog("Jogo reiniciado.");
    toast({
      title: "Jogo Reiniciado",
      description: "O jogo foi reiniciado.",
    });
  };

  const toggleInfiniteMode = () => {
    setIsInfiniteMode(!isInfiniteMode);
    addLog(`Modo infinito ${!isInfiniteMode ? 'ativado' : 'desativado'}.`);
    toast({
      title: `Modo Infinito ${!isInfiniteMode ? 'Ativado' : 'Desativado'}`,
      description: `O modo infinito foi ${!isInfiniteMode ? 'ativado' : 'desativado'}.`,
    });
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
    <div className="flex flex-wrap gap-4">
      <div className="flex-1">
        <DataUploader onCsvUpload={loadCSV} onModelUpload={loadModelFile} />
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
        <Button onClick={saveModel} className="mt-2 ml-2 bg-red-500 hover:bg-red-700">
          <Save className="mr-2 h-4 w-4" /> Salvar Sherlok
        </Button>
        <Button onClick={() => document.getElementById('loadSherlok')?.click()} className="mt-2 ml-2 bg-red-500 hover:bg-red-700">
          <Upload className="mr-2 h-4 w-4" /> Carregar Sherlok
        </Button>
        <input
          id="loadSherlok"
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && loadModel(e.target.files[0])}
        />
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Progresso da Geração {generation}</h3>
          <Progress value={progress} className="w-full" />
        </div>
        <GameBoard
          boardNumbers={boardNumbers}
          concursoNumber={concursoNumber}
          players={players}
          evolutionData={evolutionData}
          bestPlayer={bestPlayer}
          onCloneBestPlayer={cloneBestPlayer}
        />
        <LogDisplay logs={logs} />
      </div>
      <Card className="flex-1 mt-4">
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
  );
};