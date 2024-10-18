import React from 'react';
import BoardDisplay from './BoardDisplay';
import PlayerList from './PlayerList';
import EvolutionChart from './EvolutionChart';

interface GameBoardProps {
  boardNumbers: number[];
  concursoNumber: number;
  players: { id: number; score: number; predictions: number[] }[];
  evolutionData: any[];
}

const GameBoard: React.FC<GameBoardProps> = ({ boardNumbers, concursoNumber, players, evolutionData }) => {
  return (
    <div>
      <BoardDisplay numbers={boardNumbers} concursoNumber={concursoNumber} />
      <PlayerList players={players} />
      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">Pontuação dos Jogadores</h3>
        <ul className="space-y-2">
          {players.map(player => (
            <li key={player.id} className="flex justify-between items-center bg-gray-100 p-2 rounded">
              <span>Jogador {player.id}</span>
              <span className="font-bold">{player.score} pontos</span>
            </li>
          ))}
        </ul>
      </div>
      <EvolutionChart data={evolutionData} />
    </div>
  );
};

export default GameBoard;