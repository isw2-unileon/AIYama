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
      const aiResponseJSON = await aiService.proposeSchedule(requestData);
      
      // D) add the AI response to the chat (marking it as a proposal for displaying the buttons)
      const newAiMsg: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        sender: 'ai', 
        text: `He encontrado este hueco:\n${JSON.stringify(aiResponseJSON)}\n¿Te parece bien?`,
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
  const handleAcceptProposal = () => {
    // FUTURE: here we would send a request to the backend to confirm the proposed schedule and add it to the user's calendar. For now, we just show a confirmation message in the chat.
    const confirmMsg: ChatMessage = { id: Date.now().toString(), sender: 'ai', text: '¡Genial! Añadido al calendario.' };
    setMessages((prev) => [...prev, confirmMsg]);
  };

  // function for when the user clicks "NO"
  const handleRejectProposal = () => {
    const rejectMsg: ChatMessage = { id: Date.now().toString(), sender: 'ai', text: 'Vaya, buscaré otra alternativa. Dime si prefieres algún día en concreto.' };
    setMessages((prev) => [...prev, rejectMsg]);
  };

  // function to clear the chat history.
  const handleClearChat = () => {
    setMessages([]);
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