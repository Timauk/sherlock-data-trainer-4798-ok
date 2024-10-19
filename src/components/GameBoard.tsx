import React from 'react';
import BoardDisplay from './BoardDisplay';
import PlayerList from './PlayerList';
import EvolutionChart from './EvolutionChart';
import { Button } from "@/components/ui/button";

interface GameBoardProps {
  boardNumbers: number[];
  concursoNumber: number;
  players: { id: number; score: number; predictions: number[] }[];
  evolutionData: any[];
  bestPlayer: { id: number; score: number; predictions: number[] } | null;
  onCloneBestPlayer: () => void;
}

const GameBoard: React.FC<GameBoardProps> = ({ 
  boardNumbers, 
  concursoNumber, 
  players, 
  evolutionData, 
  bestPlayer,
  onCloneBestPlayer 
}) => {
  return (
    <div>
      <BoardDisplay numbers={boardNumbers} concursoNumber={concursoNumber} />
      <PlayerList players={players} bestPlayerId={bestPlayer?.id} />
      <Button onClick={onCloneBestPlayer} className="mt-4 mb-4">
        Clonar Melhor Jogador
      </Button>
      <EvolutionChart data={evolutionData} />
    </div>
  );
};

export default GameBoard;