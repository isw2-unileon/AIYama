import { useState, useEffect } from 'react';
import { aiService, type ScheduleRequest } from '../services/ai.service';

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
  const [pendingProposal, setPendingProposal] = useState<any>(null);

  // each time the messages state changes, we save the new state in localStorage to keep it updated. This way, the chat history is preserved across page reloads and browser sessions.
  useEffect(() => {
    localStorage.setItem('chatbot_history', JSON.stringify(messages));
  }, [messages]);


  // the function that handles the user input, sends it to the backend, and updates the chat with the AI response. It also handles the loading state to show a spinner or disable inputs while waiting for the response.

  // function to handle the user input, send it to the backend, and update the chat with the AI response. It also handles the loading state to show a spinner or disable inputs while waiting for the response.
  const handleSendMessage = async (taskName: string, duration: number, userId: string, chronotype: string) => {
    if (!taskName.trim()) return;
    // A) add the message of the user to the chat
    const newUserMsg: ChatMessage = { id: Date.now().toString(), sender: 'user', text: `Quiero agendar: ${taskName} (${duration} min)` };
    setMessages((prev) => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      // B) prepare the data to send to the backend.
      const requestData: ScheduleRequest = {
        user_id: userId,
        task_name: taskName,
        duration_minutes: duration,
        weekly_frequency: 1, // default 1
        preferred_days: "Ninguno en particular",
        chronotype: chronotype,
      };

      // C) call the service that sends the request to the backend and waits for the response
      const token = localStorage.getItem('token');
      const aiResponseJSON = await aiService.proposeSchedule(requestData, token || '');
      const startTime = aiResponseJSON.start_time || aiResponseJSON.scheduled_at;
      const endTime = aiResponseJSON.end_time || aiResponseJSON.scheduled_end;
      const reason = aiResponseJSON.reason || "Este hueco se adapta perfectamente a tus preferencias.";

      setPendingProposal({
        user_id: userId,
        name: taskName,
        duration_minutes: duration,
        weekly_frequency: 1,
        energy_level: "medium",
        scheduled_at: aiResponseJSON.start_time || aiResponseJSON.scheduled_at,
        scheduled_end: aiResponseJSON.end_time || aiResponseJSON.scheduled_end,
      });

      const startDate = new Date(startTime);
      const endDate = new Date(endTime);

      const fechaTexto = startDate.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
      const fechaCapitalizada = fechaTexto.charAt(0).toUpperCase() + fechaTexto.slice(1);
      const horaInicio = startDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const horaFin = endDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const mensajeVisual = `He encontrado este hueco:\n\n ${fechaCapitalizada}\n ${horaInicio} - ${horaFin}\n\n ${reason}\n\n¿Te parece bien?`;

      // D) add the AI response to the chat (marking it as a proposal for displaying the buttons)
      const newAiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: mensajeVisual,
        isProposal: true
      };
      setMessages((prev) => [...prev, newAiMsg]);

    } catch (error) {
      const errorMsg: ChatMessage = { id: Date.now().toString(), sender: 'ai', text: 'Ups, ha ocurrido un error al consultar mi cerebro artificial.' };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // function for when the user clicks "YES".
  const handleAcceptProposal = async (onSuccess?: () => void) => {
    if (!pendingProposal) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(pendingProposal)
      });

      if (!response.ok) throw new Error('Error al guardar');

      const confirmMsg: ChatMessage = { id: Date.now().toString(), sender: 'ai', text: '¡Genial! Tarea guardada correctamente en tu calendario.' };
      setMessages((prev) => [...prev, confirmMsg]);

      setPendingProposal(null);
      if (onSuccess) onSuccess();

    } catch (error) {
      const errorMsg: ChatMessage = { id: Date.now().toString(), sender: 'ai', text: 'Error al guardar la tarea en el calendario.' };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // function for when the user clicks "NO"
  const handleRejectProposal = () => {
    setPendingProposal(null);
    const rejectMsg: ChatMessage = { id: Date.now().toString(), sender: 'ai', text: 'Vaya, buscaré otra alternativa. Dime si prefieres algún día en concreto.' };
    setMessages((prev) => [...prev, rejectMsg]);
  };

  // function to clear the chat history.
  const handleClearChat = () => {
    setMessages([]);
    setPendingProposal(null);
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