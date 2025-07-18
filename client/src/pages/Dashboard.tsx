import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { useAuth } from '../hooks/useAuth';
import { Send, Server, MessageCircle, LogOut } from 'lucide-react';

interface Message {
  id: number;
  serverId: string;
  channelId: string;
  content: string;
  status: string;
  sentAt: string;
  errorMessage?: string;
}

interface DiscordServer {
  id: string;
  name: string;
  isActive: boolean;
  addedAt: string;
  memberCount?: number;
  icon?: string;
}

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  position: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedServer, setSelectedServer] = useState('');
  const [channelId, setChannelId] = useState('');
  const [message, setMessage] = useState('');
  const [useEmbed, setUseEmbed] = useState(false);
  const [embedTitle, setEmbedTitle] = useState('');
  const [embedDescription, setEmbedDescription] = useState('');
  const [embedColor, setEmbedColor] = useState('#0099ff');

  const { data: servers = [] } = useQuery<DiscordServer[]>({
    queryKey: ['/servers'],
    queryFn: () => apiRequest('/servers'),
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['/messages'],
    queryFn: () => apiRequest('/messages'),
  });

  const { data: channels = [] } = useQuery<DiscordChannel[]>({
    queryKey: ['/servers', selectedServer, 'channels'],
    queryFn: () => apiRequest(`/servers/${selectedServer}/channels`),
    enabled: !!selectedServer,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { serverId: string; channelId: string; content: string; embed?: any }) => {
      return apiRequest('/messages', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/messages'] });
      setMessage('');
      setChannelId('');
      setEmbedTitle('');
      setEmbedDescription('');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      window.location.reload();
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServer || !channelId) return;
    if (!useEmbed && !message.trim()) return;
    if (useEmbed && !embedTitle.trim() && !embedDescription.trim()) return;

    const messageData: any = {
      serverId: selectedServer,
      channelId,
      content: message,
    };

    if (useEmbed) {
      messageData.embed = {
        title: embedTitle || undefined,
        description: embedDescription || undefined,
        color: parseInt(embedColor.substring(1), 16), // Convert hex to decimal
      };
    }

    sendMessageMutation.mutate(messageData);
  };

  const insertFormatting = (format: string, targetField: 'message' | 'embedTitle' | 'embedDescription' = 'message') => {
    const textarea = document.getElementById(targetField) as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = targetField === 'message' ? message : 
                       targetField === 'embedTitle' ? embedTitle : embedDescription;
    const selectedText = currentText.substring(start, end);
    
    let beforeText = '';
    let afterText = '';
    
    switch (format) {
      case 'bold':
        beforeText = '**';
        afterText = '**';
        break;
      case 'italic':
        beforeText = '*';
        afterText = '*';
        break;
      case 'underline':
        beforeText = '__';
        afterText = '__';
        break;
      case 'strikethrough':
        beforeText = '~~';
        afterText = '~~';
        break;
      case 'code':
        beforeText = '`';
        afterText = '`';
        break;
      case 'codeblock':
        beforeText = '```\n';
        afterText = '\n```';
        break;
      case 'quote':
        beforeText = '> ';
        afterText = '';
        break;
      case 'spoiler':
        beforeText = '||';
        afterText = '||';
        break;
      case 'link':
        // For hyperlinks, prompt user for URL
        const url = prompt('Enter the URL:');
        if (url) {
          beforeText = '[';
          afterText = `](${url})`;
        } else {
          return; // Cancel if no URL provided
        }
        break;
    }
    
    const newText = currentText.substring(0, start) + beforeText + selectedText + afterText + currentText.substring(end);
    
    // Update the appropriate state
    if (targetField === 'message') {
      setMessage(newText);
    } else if (targetField === 'embedTitle') {
      setEmbedTitle(newText);
    } else if (targetField === 'embedDescription') {
      setEmbedDescription(newText);
    }
    
    // Set cursor position after formatting
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + beforeText.length, end + beforeText.length);
    }, 0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'text-green-400 bg-green-900/30 border border-green-800/50';
      case 'failed':
        return 'text-red-400 bg-red-900/30 border border-red-800/50';
      case 'pending':
        return 'text-yellow-400 bg-yellow-900/30 border border-yellow-800/50';
      default:
        return 'text-gray-400 bg-gray-900/30 border border-gray-800/50';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <MessageCircle className="h-8 w-8 text-blue-400 mr-3" />
              <h1 className="text-xl font-semibold text-white">Discord Bot Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-300">Welcome, {user?.username}</span>
              <button
                onClick={() => logoutMutation.mutate()}
                className="flex items-center px-3 py-1 text-sm text-gray-300 hover:text-white transition-colors"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Active Servers</p>
                <p className="text-2xl font-bold">{servers.length}</p>
                <p className="text-blue-200 text-xs">Connected</p>
              </div>
              <Server className="h-8 w-8 text-blue-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Messages Sent</p>
                <p className="text-2xl font-bold">{messages.filter(m => m.status === 'sent').length}</p>
                <p className="text-green-200 text-xs">Last 24h</p>
              </div>
              <MessageCircle className="h-8 w-8 text-green-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Pending</p>
                <p className="text-2xl font-bold">{messages.filter(m => m.status === 'pending').length}</p>
                <p className="text-purple-200 text-xs">In queue</p>
              </div>
              <Send className="h-8 w-8 text-purple-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm">Failed</p>
                <p className="text-2xl font-bold">{messages.filter(m => m.status === 'failed').length}</p>
                <p className="text-red-200 text-xs">Errors</p>
              </div>
              <LogOut className="h-8 w-8 text-red-200" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Send Message Form */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Send className="h-5 w-5 mr-2 text-blue-400" />
                Send Message
              </h2>
              
              <form onSubmit={handleSendMessage} className="space-y-4">
                <div>
                  <label htmlFor="server" className="block text-sm font-medium text-gray-300 mb-1">
                    Discord Server
                  </label>
                  <select
                    id="server"
                    value={selectedServer}
                    onChange={(e) => {
                      setSelectedServer(e.target.value);
                      setChannelId(''); // Clear channel when server changes
                    }}
                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select a server...</option>
                    {servers.map((server) => (
                      <option key={server.id} value={server.id}>
                        {server.name} ({server.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="channel" className="block text-sm font-medium text-gray-300 mb-1">
                    Channel
                  </label>
                  <select
                    id="channel"
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                    required
                    disabled={!selectedServer}
                  >
                    <option value="">Select a channel...</option>
                    {channels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        #{channel.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Embed Toggle */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="useEmbed"
                    checked={useEmbed}
                    onChange={(e) => setUseEmbed(e.target.checked)}
                    className="rounded border-gray-600 bg-gray-700/50 text-blue-500 focus:ring-blue-500"
                  />
                  <label htmlFor="useEmbed" className="text-sm font-medium text-gray-300">
                    Use Embed
                  </label>
                </div>

                {/* Embed Fields */}
                {useEmbed && (
                  <div className="space-y-4 p-4 bg-gray-700/30 border border-gray-600/50 rounded-lg">
                    <div>
                      <label htmlFor="embedTitle" className="block text-sm font-medium text-gray-300 mb-1">
                        Embed Title
                      </label>
                      <div className="flex flex-wrap gap-1 mb-1">
                        <button
                          type="button"
                          onClick={() => insertFormatting('bold', 'embedTitle')}
                          className="px-1 py-0.5 text-xs bg-gray-600/50 hover:bg-gray-600 rounded font-bold text-white"
                          title="Bold"
                        >
                          B
                        </button>
                        <button
                          type="button"
                          onClick={() => insertFormatting('italic', 'embedTitle')}
                          className="px-1 py-0.5 text-xs bg-gray-600/50 hover:bg-gray-600 rounded italic text-white"
                          title="Italic"
                        >
                          I
                        </button>
                        <button
                          type="button"
                          onClick={() => insertFormatting('link', 'embedTitle')}
                          className="px-1 py-0.5 text-xs bg-blue-600/50 hover:bg-blue-600 rounded text-blue-200"
                          title="Hyperlink"
                        >
                          🔗
                        </button>
                      </div>
                      <input
                        type="text"
                        id="embedTitle"
                        value={embedTitle}
                        onChange={(e) => setEmbedTitle(e.target.value)}
                        placeholder="Enter embed title..."
                        className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="embedDescription" className="block text-sm font-medium text-gray-300 mb-1">
                        Embed Description
                      </label>
                      <div className="flex flex-wrap gap-1 mb-1">
                        <button
                          type="button"
                          onClick={() => insertFormatting('bold', 'embedDescription')}
                          className="px-1 py-0.5 text-xs bg-gray-600/50 hover:bg-gray-600 rounded font-bold text-white"
                          title="Bold"
                        >
                          B
                        </button>
                        <button
                          type="button"
                          onClick={() => insertFormatting('italic', 'embedDescription')}
                          className="px-1 py-0.5 text-xs bg-gray-600/50 hover:bg-gray-600 rounded italic text-white"
                          title="Italic"
                        >
                          I
                        </button>
                        <button
                          type="button"
                          onClick={() => insertFormatting('code', 'embedDescription')}
                          className="px-1 py-0.5 text-xs bg-gray-600/50 hover:bg-gray-600 rounded font-mono text-white"
                          title="Code"
                        >
                          &lt;/&gt;
                        </button>
                        <button
                          type="button"
                          onClick={() => insertFormatting('link', 'embedDescription')}
                          className="px-1 py-0.5 text-xs bg-blue-600/50 hover:bg-blue-600 rounded text-blue-200"
                          title="Hyperlink"
                        >
                          🔗
                        </button>
                      </div>
                      <textarea
                        id="embedDescription"
                        value={embedDescription}
                        onChange={(e) => setEmbedDescription(e.target.value)}
                        rows={3}
                        placeholder="Enter embed description..."
                        className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="embedColor" className="block text-sm font-medium text-gray-300 mb-1">
                        Embed Color
                      </label>
                      <input
                        type="color"
                        id="embedColor"
                        value={embedColor}
                        onChange={(e) => setEmbedColor(e.target.value)}
                        className="w-16 h-8 border border-gray-600 rounded-md cursor-pointer bg-gray-700/50"
                      />
                    </div>
                  </div>
                )}

                {/* Message Content */}
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-1">
                    {useEmbed ? 'Additional Message (Optional)' : 'Message'}
                  </label>
                  
                  {/* Formatting Buttons */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => insertFormatting('bold')}
                      className="px-2 py-1 text-xs bg-gray-600/50 hover:bg-gray-600 rounded font-bold text-white"
                      title="Bold"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('italic')}
                      className="px-2 py-1 text-xs bg-gray-600/50 hover:bg-gray-600 rounded italic text-white"
                      title="Italic"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('underline')}
                      className="px-2 py-1 text-xs bg-gray-600/50 hover:bg-gray-600 rounded underline text-white"
                      title="Underline"
                    >
                      U
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('strikethrough')}
                      className="px-2 py-1 text-xs bg-gray-600/50 hover:bg-gray-600 rounded line-through text-white"
                      title="Strikethrough"
                    >
                      S
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('code')}
                      className="px-2 py-1 text-xs bg-gray-600/50 hover:bg-gray-600 rounded font-mono text-white"
                      title="Inline Code"
                    >
                      &lt;/&gt;
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('codeblock')}
                      className="px-2 py-1 text-xs bg-gray-600/50 hover:bg-gray-600 rounded font-mono text-white"
                      title="Code Block"
                    >
                      { }
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('quote')}
                      className="px-2 py-1 text-xs bg-gray-600/50 hover:bg-gray-600 rounded text-white"
                      title="Quote"
                    >
                      "
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('spoiler')}
                      className="px-2 py-1 text-xs bg-gray-600/50 hover:bg-gray-600 rounded text-white"
                      title="Spoiler"
                    >
                      ||
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('link')}
                      className="px-2 py-1 text-xs bg-blue-600/50 hover:bg-blue-600 rounded text-blue-200"
                      title="Hyperlink"
                    >
                      🔗
                    </button>
                  </div>
                  
                  <textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    placeholder={useEmbed ? "Additional message content..." : "Enter your message..."}
                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required={!useEmbed}
                  />
                  
                  {/* Formatting Help */}
                  <div className="mt-2 text-xs text-gray-400">
                    <p>Discord formatting: **bold**, *italic*, __underline__, ~~strikethrough~~, `code`, ```codeblock```, &gt; quote, ||spoiler||, [link text](url)</p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={sendMessageMutation.isPending}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2 px-4 rounded-md hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {sendMessageMutation.isPending ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>
          </div>

          {/* Servers List */}
          <div>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Server className="h-5 w-5 mr-2 text-blue-400" />
                Your Servers
              </h2>
              
              {servers.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No servers found. Add the bot to your Discord server first.</p>
              ) : (
                <div className="space-y-2">
                  {servers.map((server) => (
                    <div
                      key={server.id}
                      className="flex items-center justify-between p-3 bg-gray-700/30 border border-gray-600/50 rounded-lg hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-center">
                        <Server className="h-4 w-4 text-gray-400 mr-3" />
                        <div>
                          <p className="font-medium text-white">{server.name}</p>
                          <p className="text-sm text-gray-400">{server.id}</p>
                        </div>
                      </div>
                      <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${server.isActive ? 'bg-green-900/30 text-green-400 border border-green-800/50' : 'bg-gray-900/30 text-gray-400 border border-gray-800/50'}`}>
                        {server.isActive ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Message History */}
        <div className="mt-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
              <MessageCircle className="h-5 w-5 mr-2 text-blue-400" />
              Message History
            </h2>
            
            {messages.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No messages sent yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b border-gray-700/50">
                      <th className="text-left py-3 px-4 text-gray-300 font-medium">Server</th>
                      <th className="text-left py-3 px-4 text-gray-300 font-medium">Channel</th>
                      <th className="text-left py-3 px-4 text-gray-300 font-medium">Message</th>
                      <th className="text-left py-3 px-4 text-gray-300 font-medium">Status</th>
                      <th className="text-left py-3 px-4 text-gray-300 font-medium">Sent At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messages.map((msg) => (
                      <tr key={msg.id} className="border-b border-gray-700/30 hover:bg-gray-700/20 transition-colors">
                        <td className="py-3 px-4 text-gray-300">
                          {servers.find(s => s.id === msg.serverId)?.name || msg.serverId}
                        </td>
                        <td className="py-3 px-4 text-gray-300">{msg.channelId}</td>
                        <td className="py-3 px-4 max-w-xs truncate text-gray-300">{msg.content}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(msg.status)}`}>
                            {msg.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-400">
                          {new Date(msg.sentAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}