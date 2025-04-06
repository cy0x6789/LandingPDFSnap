# URL to PDF Converter

A web application that efficiently converts Next.js/Tailwind landing pages (or any webpage) to PDFs using Playwright. This tool provides a streamlined document generation experience with enhanced user interaction and processing feedback.

## Features

- **Multiple URLs Processing**: Convert multiple web pages to PDF in a single operation
- **Real-Time Progress Tracking**: See the status of each URL conversion in real-time
- **PDF Management**: View, preview, and download generated PDFs from the application
- **Auto-Scrolling**: Automatically scrolls pages before PDF generation to capture all content
- **Network Idle Detection**: Waits for network activity to complete to ensure all dynamic content is loaded
- **Unique File Naming**: Generated PDFs include timestamps to prevent overwriting

## Technology Stack

- **Frontend**: React with TypeScript, Tailwind CSS, shadcn UI components
- **Backend**: Express.js server
- **PDF Generation**: Playwright for rendering and capturing web pages
- **State Management**: React Hooks and Context
- **Routing**: wouter for client-side routing
- **API Communication**: TanStack Query for data fetching and state management

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- Chromium browser (automatically installed with the Playwright dependency)

### Installation

1. Clone the repository
2. Install dependencies
3. Start the development server
4. Open your browser and navigate to http://localhost:5000

## Usage

1. **Enter URLs**: Add one or more URLs in the text area (each URL on a new line)
2. **Specify Output Directory**: Enter a path where the PDFs will be saved
3. **Start Processing**: Click "Generate PDFs" to begin the conversion process
4. **Monitor Progress**: View the real-time status of each URL conversion
5. **View Results**: After completion, view the generated PDFs directly in the application
6. **Download or View**: Choose to download PDFs or view them directly in the browser

## Architecture

The application follows a client-server architecture:

- **Client**: React-based frontend that provides the user interface for URL input, processing status, and PDF management
- **Server**: Express.js backend that handles PDF generation, file management, and API endpoints
- **PDF Generation**: Playwright automation that renders URLs and creates PDFs with advanced features like auto-scrolling

## API Endpoints

- `POST /api/pdf/generate`: Start PDF generation for a list of URLs
- `GET /api/pdf/status/:jobId`: Get the current status of a PDF generation job
- `POST /api/pdf/cancel`: Cancel an ongoing PDF generation job
- `GET /api/pdf/list/:jobId`: List all PDFs generated for a specific job
- `GET /api/pdf/view/:filename`: View a generated PDF in the browser
- `GET /api/pdf/download/:filename`: Download a generated PDF

## Future Enhancements

- Authentication and user accounts for saving preferences
- Custom PDF generation options (paper size, orientation, margins)
- Batch job management and scheduling
- Email notifications when large jobs complete
- Enhanced error handling and retry logic for failed conversions

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Playwright](https://playwright.dev/) for web automation and PDF generation
- [React](https://reactjs.org/) for the frontend framework
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [shadcn/ui](https://ui.shadcn.com/) for beautiful UI components
- [TanStack Query](https://tanstack.com/query/latest) for data fetching and state management
