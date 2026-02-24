
"""
Flo Family Calendar - Architecture Diagram Generator
Generates comprehensive PNG architecture diagrams showing frontend, backend, and AWS services
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Rectangle
import os

# Ensure output directory exists
os.makedirs('generated-diagrams-v2', exist_ok=True)

# Color scheme
COLOR_CLIENT = '#E8F4F8'
COLOR_API = '#B3E5FC'
COLOR_SERVICES = '#81D4FA'
COLOR_BEDROCK = '#4FC3F7'
COLOR_DATA = '#29B6F6'
COLOR_AWS = '#0288D1'
COLOR_BORDER = '#01579B'

def draw_box(ax, x, y, width, height, text, color, fontsize=9, fontweight='normal'):
    """Draw a rounded rectangle box with text"""
    box = FancyBboxPatch((x, y), width, height, boxstyle="round,pad=0.1", 
                         edgecolor=COLOR_BORDER, facecolor=color, linewidth=2)
    ax.add_patch(box)
    ax.text(x + width/2, y + height/2, text, ha='center', va='center', 
            fontsize=fontsize, fontweight=fontweight, wrap=True)

def draw_arrow(ax, x1, y1, x2, y2, label=''):
    """Draw an arrow between two points"""
    arrow = FancyArrowPatch((x1, y1), (x2, y2), arrowstyle='->', 
                           mutation_scale=20, linewidth=2, color=COLOR_BORDER)
    ax.add_patch(arrow)
    if label:
        mid_x, mid_y = (x1 + x2) / 2, (y1 + y2) / 2
        ax.text(mid_x + 1, mid_y, label, fontsize=8, style='italic')

# ============================================================================
# DIAGRAM 1: COMPLETE ARCHITECTURE
# ============================================================================
print("Generating architecture diagram...")

fig, ax = plt.subplots(1, 1, figsize=(20, 24))
ax.set_xlim(0, 100)
ax.set_ylim(0, 120)
ax.axis('off')

# Title
ax.text(50, 118, 'Flo Family Calendar - Complete Architecture Diagram', 
        ha='center', fontsize=18, fontweight='bold')
ax.text(50, 115, '85% Complete - Production-Ready MVP', 
        ha='center', fontsize=12, style='italic', color='#666')

# ============================================================================
# LAYER 1: CLIENT LAYER (Browser)
# ============================================================================
y_pos = 108
ax.text(2, y_pos, 'CLIENT LAYER (Browser)', fontsize=11, fontweight='bold', 
        bbox=dict(boxstyle='round', facecolor='#FFF9C4', alpha=0.7))

draw_box(ax, 5, y_pos-8, 90, 7, 'React 18 PWA Application (Vite + TypeScript)', COLOR_CLIENT, 10, 'bold')

draw_box(ax, 6, y_pos-14, 20, 4, 'Pages\n• Landing\n• Login\n• Onboarding\n• Dashboard', COLOR_CLIENT, 8)
draw_box(ax, 28, y_pos-14, 20, 4, 'Components (15+)\n• Calendar Grid\n• Dashboard\n• Modals\n• Charts', COLOR_CLIENT, 8)
draw_box(ax, 50, y_pos-14, 20, 4, 'Services\n• WebSocket\n• Cache\n• Offline Sync\n• Notifications', COLOR_CLIENT, 8)
draw_box(ax, 72, y_pos-14, 20, 4, 'Design System\n• Colors\n• Typography\n• Spacing\n• Responsive', COLOR_CLIENT, 8)

# ============================================================================
# LAYER 2: API GATEWAY & ROUTING
# ============================================================================
y_pos = 88
ax.text(2, y_pos, 'API GATEWAY & ROUTING', fontsize=11, fontweight='bold',
        bbox=dict(boxstyle='round', facecolor='#C8E6C9', alpha=0.7))

draw_box(ax, 5, y_pos-6, 90, 5, 'Express.js API Server (Node.js) - Port 3000 / Lambda', COLOR_API, 10, 'bold')

draw_box(ax, 6, y_pos-12, 18, 5, 'Auth Routes\n• register\n• login\n• logout', COLOR_API, 8)
draw_box(ax, 26, y_pos-12, 18, 5, 'Event Routes\n• CRUD events\n• categories\n• allocation', COLOR_API, 8)
draw_box(ax, 46, y_pos-12, 18, 5, 'Dashboard Routes\n• metrics\n• thresholds\n• suggestions', COLOR_API, 8)
draw_box(ax, 66, y_pos-12, 18, 5, 'New Routes\n• conflicts\n• preferences\n• sync status', COLOR_API, 8)

# ============================================================================
# LAYER 3: BUSINESS LOGIC SERVICES
# ============================================================================
y_pos = 70
ax.text(2, y_pos, 'BUSINESS LOGIC LAYER (33 Services)', fontsize=11, fontweight='bold',
        bbox=dict(boxstyle='round', facecolor='#FFCCBC', alpha=0.7))

draw_box(ax, 6, y_pos-6, 16, 5, 'Auth & Access\n• auth-service\n• session-manager\n• password-manager', COLOR_SERVICES, 8)
draw_box(ax, 24, y_pos-6, 16, 5, 'Event Management\n• event-service\n• classifier-service\n• extracurricular', COLOR_SERVICES, 8)
draw_box(ax, 42, y_pos-6, 16, 5, 'Time Tracking\n• dashboard-builder\n• metrics-calculator\n• time-aggregator', COLOR_SERVICES, 8)
draw_box(ax, 60, y_pos-6, 16, 5, 'Notifications\n• dispatcher\n• builder\n• preferences', COLOR_SERVICES, 8)
draw_box(ax, 78, y_pos-6, 16, 5, 'Conflict Mgmt\n• detector\n• resolution-engine\n• applier', COLOR_SERVICES, 8)

draw_box(ax, 6, y_pos-13, 16, 5, 'Summaries\n• generator\n• scheduler\n• event-triggered', COLOR_SERVICES, 8)
draw_box(ax, 24, y_pos-13, 16, 5, 'Thresholds\n• threshold-service\n• monitor\n• alerts', COLOR_SERVICES, 8)
draw_box(ax, 42, y_pos-13, 16, 5, 'Calendar Sources\n• registry\n• integration\n• sync', COLOR_SERVICES, 8)
draw_box(ax, 60, y_pos-13, 16, 5, 'Data Management\n• backup-manager\n• recovery\n• retention', COLOR_SERVICES, 8)
draw_box(ax, 78, y_pos-13, 16, 5, 'Onboarding\n• setup-service\n• preferences\n• validation', COLOR_SERVICES, 8)

# ============================================================================
# LAYER 4: AWS BEDROCK AGENT LAYER
# ============================================================================
y_pos = 48
ax.text(2, y_pos, 'AWS BEDROCK AGENT LAYER (30+ Files)', fontsize=11, fontweight='bold',
        bbox=dict(boxstyle='round', facecolor='#F8BBD0', alpha=0.7))

draw_box(ax, 6, y_pos-6, 18, 5, 'Core Components\n• lambda-handler\n• bedrock-invoker\n• agent-registry', COLOR_BEDROCK, 8)
draw_box(ax, 26, y_pos-6, 18, 5, '10 Agent Types\n• Weather\n• Calendar Query\n• Classifier', COLOR_BEDROCK, 8)
draw_box(ax, 46, y_pos-6, 18, 5, 'Tool Functions\n• calendar-tool\n• weather-tool\n• parser-tool', COLOR_BEDROCK, 8)
draw_box(ax, 66, y_pos-6, 18, 5, 'Error Handling\n• error-handler\n• retry-logic\n• fallback-mgr', COLOR_BEDROCK, 8)

draw_box(ax, 6, y_pos-13, 18, 5, 'Data Persistence\n• execution-persist\n• execution-retrieval\n• dynamodb-schema', COLOR_BEDROCK, 8)
draw_box(ax, 26, y_pos-13, 18, 5, 'Configuration\n• config-loader\n• config-validator\n• config-updater', COLOR_BEDROCK, 8)
draw_box(ax, 46, y_pos-13, 18, 5, 'Monitoring\n• metrics-publisher\n• cloudwatch-alarms\n• logger', COLOR_BEDROCK, 8)
draw_box(ax, 66, y_pos-13, 18, 5, 'Event Publishing\n• sns-publisher\n• event-builder\n• validation', COLOR_BEDROCK, 8)

# ============================================================================
# LAYER 5: DATA ACCESS LAYER
# ============================================================================
y_pos = 26
ax.text(2, y_pos, 'DATA ACCESS LAYER', fontsize=11, fontweight='bold',
        bbox=dict(boxstyle='round', facecolor='#E1BEE7', alpha=0.7))

draw_box(ax, 6, y_pos-6, 88, 5, 'DynamoDB Client Wrapper\n• dynamodb-client.ts (CRUD) • dynamodb-with-cache.ts (caching)\nFeatures: Single-table design, Query optimization, Connection pooling, Error handling', COLOR_DATA, 9)

# ============================================================================
# LAYER 6: AWS SERVICES
# ============================================================================
y_pos = 14
ax.text(2, y_pos, 'AWS SERVICES LAYER', fontsize=11, fontweight='bold',
        bbox=dict(boxstyle='round', facecolor='#B2DFDB', alpha=0.7))

draw_box(ax, 6, y_pos-6, 14, 5, 'DynamoDB\n• Data Persistence\n', COLOR_DATA, 9)