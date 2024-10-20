import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { createModel, trainModel, TrainingConfig } from '@/utils/aiModel';
import { useToast } from "@/hooks/use-toast";

interface ModelTrainingProps {
  data: number[][];
  onModelTrained: (model: tf.LayersModel) => void;
}

const ModelTraining: React.FC<ModelTrainingProps> = ({ data, onModelTrained }) => {
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleTrainModel = async () => {
    setIsTraining(true);
    setProgress(0);

    const model = createModel();
    const config: TrainingConfig = {
      epochs: 100,
      batchSize: 32,
      validationSplit: 0.2,
      earlyStoppingPatience: 10
    };

    try {
      const history = await trainModel(model, data, config);
      onModelTrained(model);
      toast({
        title: "Treinamento Concluído",
        description: `Perda final: ${history.history.loss[history.history.loss.length - 1].toFixed(4)}`
      });
    } catch (error) {
      toast({
        title: "Erro no Treinamento",
        description: "Ocorreu um erro durante o treinamento do modelo.",
        variant: "destructive"
      });
    } finally {
      setIsTraining(false);
      setProgress(100);
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={handleTrainModel} disabled={isTraining}>
        {isTraining ? "Treinando..." : "Treinar Modelo"}
      </Button>
      {isTraining && <Progress value={progress} className="w-full" />}
    </div>
  );
};

export default ModelTraining;