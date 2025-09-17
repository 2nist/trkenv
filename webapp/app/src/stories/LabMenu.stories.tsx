import type { Meta, StoryObj } from '@storybook/react';
import LabMenu from '../components/LabMenu/LabMenu';

const meta: Meta<typeof LabMenu> = {
  title: 'Components/LabMenu',
  component: LabMenu,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onOpenModule: { action: 'opened module' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithMockData: Story = {
  args: {},
  parameters: {
    mockData: [
      {
        url: '/api/registry',
        method: 'GET',
        status: 200,
        response: {
          panels: [
            { id: 'home', name: 'Home Panel', path: 'modules/panels/home', ui: 'index.html' },
            { id: 'settings', name: 'Settings', path: 'modules/panels/settings', ui: 'index.html' },
          ],
          tools: [
            { id: 'editor', name: 'Code Editor', path: 'modules/tools/editor', ui: 'index.html' },
          ],
          jobs: [
            { id: 'audio-engine', name: 'Audio Engine', path: 'experiments/audio-engine', ui: 'ui/index.html' },
          ],
          devices: [],
          datasets: [],
          exporters: [],
        },
      },
    ],
  },
};