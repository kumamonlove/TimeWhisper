# TimeWhisper

Client Milestone 1 Meeting Note: https://github.com/kumamonlove/TimeWhisper/issues/6#issue-3037033222



TimeWhisper is a time management web application built with React and Python FastAPI, integrated with DeepSeek AI features to help users better manage their time and tasks.

## Features

1. **Task Management**: Add, view, complete, and delete tasks
2. **AI Assistant**: Offers time management advice and assistance
   - Supports multiple DeepSeek model options
   - **DeepSeek-V3 (deepseek-chat)**: General-purpose conversational model
   - **DeepSeek-R1 (deepseek-reasoner)**: Optimized for complex reasoning
   - Markdown rendering supported, including code highlighting
3. **Task Statistics**
   - Tracks completed vs. uncompleted tasks
   - Displays weekly activity overview
   - Automatically syncs with Task Manager and AI-generated tasks
4. **Cross-Module Integration**
   - Seamless communication between Chat Assistant, Task Manager, and Statistics
   - No manual duplication required between modules

## Tech Stack

- **Frontend**: React, Axios, React Icons, React Markdown
- **Backend**: Python, FastAPI, DeepSeek API

## Project Structure

```
time-management/
├── backend/
│   ├── main_openai_sdk.py   # FastAPI main app (using OpenAI SDK)
│   └── run_sdk.py           # Startup script (using OpenAI SDK)
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       │   ├── TaskList.js
│       │   └── ChatAssistant.js
│       │   └── TaskStatistics.js
│       ├── App.js
│       ├── App.css
│       ├── index.js
│       └── index.css
├── .env                     # Environment variable example file
└── requirements.txt         # Python dependencies
```

## Installation & Run

### Backend

1. Install Python dependencies:

   ```
   pip install -r requirements.txt
   ```

2. Create a `.env` file and set your DeepSeek API key:

   ```
   DEEPSEEK_API_KEY=your_deepseek_api_key_here
   ```

   - Note: The API key typically starts with `sk-`
   - You can obtain it at https://platform.deepseek.com/api_keys

3. Start the backend:

   Using OpenAI SDK (recommended):

   ```
   cd backend
   python run_sdk.py
   ```

### Frontend

1. Install Node.js dependencies:

   ```
   cd frontend
   npm install
   npm install react-markdown react-syntax-highlighter --save
   npm install remark-gfm
   npm install react-datepicker
   ```

2. Start the frontend development server:

   ```
   npm start
   npm run build
   npm install -g serve
   serve -s build
   ```

## DeepSeek API Usage

This project supports two ways to call the DeepSeek API:

1. **Using `requests` (direct HTTP)**: Manually sending HTTP requests to the API endpoints
2. **Using OpenAI SDK**: Leverages OpenAI-compatible endpoints, which is the recommended approach by DeepSeek

Since DeepSeek provides OpenAI-compatible APIs, you can use the OpenAI SDK directly with minimal configuration.

### Supported Models

1. **DeepSeek-V3** (`deepseek-chat`): General-purpose model for everyday conversations and basic inquiries
2. **DeepSeek-R1** (`deepseek-reasoner`): Reasoning-optimized model for complex logic and analytical responses

Users can choose the desired model from a dropdown menu in the chat interface. Each model may respond differently in style and content.

### Markdown Support

The chat interface supports rendering Markdown-formatted responses, including:

- Headings (H1-H6)
- Lists (ordered and unordered)
- Links and images
- Code blocks with syntax highlighting
- Tables
- Blockquotes
- Bold, italic, and other text styles

This allows the AI assistant to present rich, structured content. Try prompting the assistant with something like:

```
Please provide a time management plan for today in Markdown, including a table and some code examples.
```

### Troubleshooting

1. **API Errors**:
   - Ensure your API key is valid (starts with `sk-`)
   - Verify the selected model name (`deepseek-chat` or `deepseek-reasoner`)
   - Check that request parameters are correctly formatted
2. **Timeouts**:
   - Might be due to network issues or slow API response — try increasing the timeout value
3. **Markdown Rendering Issues**:
   - Ensure `react-markdown` and `react-syntax-highlighter` are installed
   - Check that the AI's response conforms to proper Markdown syntax

## How to Use

1. Visit `http://localhost:3000` to open the app
2. Use the **"Task Management"** tab to add and manage tasks
3. Use the **"Chat Assistant"** tab to interact with the AI assistant for time management suggestions
   - Select your preferred model from the dropdown
   - Try prompting the AI to use Markdown (e.g., tables, code blocks) for better output formatting

------

## Update – April 25

1. **Added Conversation History**:
    The assistant now retains up to 5 rounds of context for better continuity, eliminating the issue of single-turn conversations.
2. **Improved Table Display**:
    Integrated the `remark-gfm` plugin to correctly render Markdown tables. No more garbled outputs when displaying time schedules.
3. **Fixed Chat Tab State Loss**:
    Resolved an issue where switching from Chat Assistant to Task Management would clear previous conversation history.
4. **Chat Output Stream Control**:
    You can now stop and interrupt the assistant’s response mid-generation if you realize your input was incorrect.
5. **Enhanced Date-Time Selection in Tasks**:
    Tasks now support selecting specific time (e.g., 10:00 AM or 3:00 PM), not just the date.
6. **Fixed Timezone Offset Bug**:
    Task date displays now correctly align with local time without unwanted timezone shifts.

------

## Update – May 02

**Swap pages and task pages**:
Adjusted the positions of the conversation page and task page.

Of course! Here's the English version of your content:

**Modernized Color Scheme:**

- Adopted a blue-based primary color (#3a6ea5) for a more professional and composed appearance
- Defined a complete color system and variables for easier maintenance and consistent visual style
- Introduced more refined grayscale gradients to enhance the sense of depth in the interface

**Sophisticated Visual Effects:**

- Added detailed shadow effects to enhance depth and dimensionality
- Optimized border radii to make the interface more modern and softer
- Introduced transition animations to make interactions smoother and more natural

**Improved Layout and Typography:**

- Expanded the overall container width for better space utilization
- Optimized tab styles by using an underline to indicate the active tab
- Enhanced the layout of task lists and chat interfaces to improve readability

**Advanced Detail Enhancements:**

- Added decorative underlines to headings
- Introduced hover animations and elevation effects for task items
- Improved the state feedback of buttons and input fields
- Added fade-in animations for messages

**Refined Form Elements:**

- Beautified the styles of input fields and buttons
- Enhanced the focus state of form elements
- Optimized the styling of the date picker

------

## Update – May 9th

Created the **TaskStats** component:

- Includes four different types of charts (pie chart, bar chart, line chart).
- Displays task completion status, task category distribution, weekly task trends, and yearly trends.
- Utilizes the **Recharts** library to implement chart functionalities.

Updated **App.js**:

- Added a **"Task Statistics"** tab.
- Enabled automatic display of the statistics popup when a task is marked as completed.
- Implemented a popup window to show statistical information, with the ability to close it.

Added corresponding **CSS styles**:

- Designed a visually appealing layout and animation effects for the statistics cards.
- Styled the popup window, including a semi-transparent background and animations.
- Ensured responsive design of the statistical charts across different screen sizes.

Now, users can view task statistics in two ways:

- Click the **"Task Statistics"** tab to view all statistics at any time.
- Automatically see the statistics popup after marking a task as completed.

Each chart is dynamic and updates in real time based on the task data, providing intuitive data visualization, including:

- The ratio of completed to incomplete tasks.
- Distribution of tasks across different categories.
- Weekly task completion trends.
- Annual task completion trends.

Created login interfacet:

- The login interface uses a landscape map.
- The login username and password used are admin and admin.
- Set up in a simple and elegant form.

------
## Update – May 16th

Enhanced the conversation and task management features:

- **ChatGPT-style Conversation Management**: 
  - Added ability to create new conversations with a single click
  - Implemented conversation history storage in SQLite database
  - Added sidebar to view and switch between previous conversations
  - Enabled conversation title editing for better organization

- **Persistent Chat History**:
  - All conversations are now saved automatically
  - Users can resume previous conversations at any time
  - Chat sessions persist across application restarts
  - Multiple conversations can be managed simultaneously
  
- **AI-Powered Task Table Import**:
  - Added "Request Plan Table" button to generate task schedules in table format
  - Implemented intelligent detection of Markdown tables in AI responses
  - Enabled one-click import of detected tables into Task Manager
  - Added date recognition with automatic time distribution for imported tasks
  - Supports keywords like "today", "tomorrow", "next Monday", etc. for smarter scheduling

These improvements make the application more powerful for time management, combining the AI assistant's planning capabilities with practical task tracking features.

------
## May 16 - Meeting Notes

- The meeting notes are documented in the GitHub Issue tracker, summary here: [Meeting Note May 16](https://github.com/kumamonlove/TimeWhisper/issues/8)
------

