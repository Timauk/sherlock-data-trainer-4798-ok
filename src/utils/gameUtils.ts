import { toast } from "@/hooks/use-toast";

export const showToast = (title: string, description: string, variant: "default" | "destructive" = "default") => {
  toast({ title, description, variant });
};

export const loadCSV = async (file: File, setCsvData: (data: number[][]) => void, setCsvDates: (dates: Date[]) => void, addLog: (message: string) => void) => {
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
    showToast("CSV Carregado", `${data.length} registros processados com sucesso.`);
  } catch (error) {
    addLog(`Erro ao carregar CSV: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    showToast("Erro ao carregar CSV", "Ocorreu um erro ao processar o arquivo.", "destructive");
  }
};

export const loadModel = async (jsonFile: File, weightsFile: File, setTrainedModel: (model: any) => void, addLog: (message: string) => void) => {
  try {
    const tf = await import('@tensorflow/tfjs');
    const model = await tf.loadLayersModel(tf.io.browserFiles([jsonFile, weightsFile]));
    setTrainedModel(model);
    addLog("Modelo carregado com sucesso!");
    showToast("Modelo Carregado", "O modelo de IA foi carregado com sucesso.");
  } catch (error) {
    addLog(`Erro ao carregar o modelo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    console.error("Detalhes do erro:", error);
    showToast("Erro ao carregar o modelo", "Ocorreu um erro ao carregar o modelo de IA.", "destructive");
  }
};