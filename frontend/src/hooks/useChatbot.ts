import { useState, useEffect } from 'react';
import { aiService } from '../services/ai.service';

// structure of a chat message, which can be from the user or from the AI, and optionally can be a proposal that shows the buttons
export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  isProposal?: boolean; // if its true,  will show the "Sí" and "No" buttons for the user to accept or reject the proposal
}

export const useChatbot = () => {
  // saved in localStorage to persist the chat history even if the user refreshes the page or closes and reopens the browser. The initial state is either the saved history or a default welcome message from the AI.
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const savedMessages = localStorage.getItem('chatbot_history');
    return savedMessages ? JSON.parse(savedMessages) : [
      { id: '1', sender: 'ai', text: '¡Hola! Dime qué tarea quieres añadir al calendario y buscaré el mejor hueco.' }
    ];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [pendingProposals, setPendingProposals] = useState<any[]>([]);
  const [taskContext, setTaskContext] = useState<{name: string, duration: number, freq: number} | null>(null);

  // each time the messages state changes, we save the new state in localStorage to keep it updated. This way, the chat history is preserved across page reloads and browser sessions.
  useEffect(() => {
    localStorage.setItem('chatbot_history', JSON.stringify(messages));
  }, [messages]);


  // function to handle the user input, send it to the backend, and update the chat with the AI response.
  const handleSendMessage = async (rawInput: string, userId: string, chronotype: string) => {
    if (!rawInput.trim()) return;
    
    // A) add the raw message of the user to the chat
    const newUserMsg: ChatMessage = { id: Date.now().toString(), sender: 'user', text: rawInput };
    setMessages((prev) => [...prev, newUserMsg]);
    setIsLoading(true);

    try {

        let finalPrompt = rawInput;
      if (taskContext) {
        finalPrompt = `CONTEXTO PREVIO: Tarea '${taskContext.name}' de ${taskContext.duration} min (${taskContext.freq} días/semana). \nMENSAJE NUEVO DEL USUARIO: "${rawInput}". \nINSTRUCCIÓN: Si el mensaje nuevo parece una modificación o preferencia de horario (ej. 'el viernes', 'por la tarde', 'más tiempo'), aplícalo al contexto previo. Si el mensaje nuevo es una petición de una tarea completamente distinta (ej. 'añade limpiar', 'quiero estudiar'), ignora el contexto previo por completo y procesa solo la tarea nueva.`;
        
        setTaskContext(null); // clear the memory for next time
      }

      // B) prepare the data to send to the backend (sending the raw prompt)
      const requestData = {
        user_id: userId,
        raw_prompt: finalPrompt,
        preferred_days: "Ninguno en particular",
        chronotype: chronotype || "medium",
      };

      // C) call the service that sends the request to the backend and waits for the response
      const token = localStorage.getItem('token');
      // we use "as any" because we changed the interface to send raw_prompt instead of task_name
      const aiResponseJSON = await aiService.proposeSchedule(requestData as any, token || '');
      
      const sessions = aiResponseJSON.sessions || [];
      const reason = aiResponseJSON.reason || "Este plan se adapta perfectamente a tus preferencias.";
      
      // Get the clean extracted data from the AI response
      const cleanName = aiResponseJSON.task_name || rawInput;
      const exactDuration = aiResponseJSON.duration_minutes || 60;

      // save the proposals in the state
      const proposalsToSave = sessions.map((session: any) => ({
        user_id: userId,
        name: cleanName,
        duration_minutes: exactDuration,
        weekly_frequency: aiResponseJSON.weekly_frequency || sessions.length || 1,
        energy_level: "medium",
        scheduled_at: session.start_time,
        scheduled_end: session.end_time,
      }));

      setPendingProposals(proposalsToSave);

      // format the dates for the visual message
      let sesionesTexto = "";
      sessions.forEach((s: any, index: number) => {
        const sd = new Date(s.start_time);
        const ed = new Date(s.end_time);
        const fecha = sd.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
        const inicio = sd.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const fin = ed.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        sesionesTexto += `\n 📅 ${index + 1}. ${fecha}: ${inicio} - ${fin}`;
      });
      
      // format the final message to show the extracted info to the user
      const mensajeVisual = `He entendido que quieres "${cleanName}" (${exactDuration} min). He planificado ${sessions.length} sesión/es:\n${sesionesTexto}\n\n💡 ${reason}\n\n¿Te parece bien?`;

      // D) add the AI response to the chat (marking it as a proposal for displaying the buttons)
      const newAiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: mensajeVisual,
        isProposal: true
      };
      setMessages((prev) => [...prev, newAiMsg]);

    } catch (error) {
      console.error("Error in handleSendMessage:", error);
      const errorMsg: ChatMessage = { id: Date.now().toString(), sender: 'ai', text: 'Ups, ha ocurrido un error al consultar mi cerebro artificial.' };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // function for when the user clicks "YES".
  const handleAcceptProposal = async (onSuccess?: () => void) => {
    if (!pendingProposals || pendingProposals.length === 0) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      for (const proposal of pendingProposals) {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(proposal)
        });
        if (!response.ok) throw new Error('Error al guardar');
      }

      const confirmMsg: ChatMessage = { id: Date.now().toString(), sender: 'ai', text: `¡Genial! Las ${pendingProposals.length} tareas se han guardado correctamente en tu calendario.` };
      setMessages((prev) => [...prev, confirmMsg]);

      setPendingProposals([]);
      if (onSuccess) onSuccess();

    } catch (error) {
      const errorMsg: ChatMessage = { id: Date.now().toString(), sender: 'ai', text: 'Error al guardar las tareas en el calendario.' };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // function for when the user clicks "NO"
  const handleRejectProposal = () => {
    // save the data for giving context to the conversation.
    if (pendingProposals.length > 0) {
      const firstProposal = pendingProposals[0];
      setTaskContext({
        name: firstProposal.name,
        duration: firstProposal.duration_minutes,
        freq: firstProposal.weekly_frequency
      });
    }

    setPendingProposals([]);
    const rejectMsg: ChatMessage = { id: Date.now().toString(), sender: 'ai', text: 'Vaya, buscaré otra alternativa. Dime si prefieres algún día en concreto.' };
    setMessages((prev) => [...prev, rejectMsg]);
  };

  // function to clear the chat history.
  const handleClearChat = () => {
    setMessages([]);
    setPendingProposals([]);
    localStorage.removeItem('chatbot_history');
  };

  // 3. return all for the interface
  return {
    messages,
    isLoading,
    handleSendMessage,
    handleAcceptProposal,
    handleRejectProposal,
    handleClearChat
  };
};