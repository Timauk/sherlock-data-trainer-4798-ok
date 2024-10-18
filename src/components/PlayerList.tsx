import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Player {
  id: number;
  score: number;
  predictions: number[];
}

interface PlayerListProps {
  players: Player[];
}

const PlayerList: React.FC<PlayerListProps> = ({ players }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
      {players.map(player => {
        const lastScore = player.predictions.length > 0 ? player.predictions.filter(num => player.predictions.includes(num)).length : 0;
        return (
          <Card key={player.id} className="bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Jogador {player.id}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold mb-2">Pontuação Total: {player.score.toFixed(2)}</p>
              <p className="mb-1">Última Pontuação: {lastScore}</p>
              <p className="mb-1 text-sm">Previsões: {player.predictions.join(', ') || 'Nenhuma previsão ainda'}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default PlayerList;