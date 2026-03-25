import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { TopicsService } from './topics.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('topics')
@Controller('topics')
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create a new topic',
    description: 'Creates a new topic with a category and optional tags. Topics are the main learning content units.',
  })
  @ApiBody({ type: CreateTopicDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Topic successfully created.',
    schema: {
      example: {
        id: 1,
        name: 'Present Perfect Tense',
        categoryId: 1,
        complexity: 3,
        language: 'en',
        createdAt: '2026-03-25T10:00:00Z',
        updatedAt: '2026-03-25T10:00:00Z',
        category: { id: 1, name: 'Grammar' },
        tags: []
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Category or tag not found.' })
  @ApiResponse({ status: 400, description: 'Invalid tag IDs or input data.' })
  create(@Body() createTopicDto: CreateTopicDto) {
    return this.topicsService.create(createTopicDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all topics',
    description: 'Retrieves all available topics with their associated categories and tags.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Return all topics.',
    schema: {
      example: [
        {
          id: 1,
          name: 'Present Perfect Tense',
          categoryId: 1,
          complexity: 3,
          language: 'en',
          createdAt: '2026-03-25T10:00:00Z',
          updatedAt: '2026-03-25T10:00:00Z',
          category: { id: 1, name: 'Grammar' },
          tags: []
        }
      ]
    }
  })
  findAll() {
    return this.topicsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get a topic by id',
    description: 'Retrieves a specific topic by its ID along with its category and all associated tags.',
  })
  @ApiParam({ 
    name: 'id', 
    type: Number, 
    description: 'The ID of the topic to retrieve' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Return a topic.',
    schema: {
      example: {
        id: 1,
        name: 'Present Perfect Tense',
        categoryId: 1,
        complexity: 3,
        language: 'en',
        createdAt: '2026-03-25T10:00:00Z',
        updatedAt: '2026-03-25T10:00:00Z',
        category: { id: 1, name: 'Grammar' },
        tags: []
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Topic not found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.topicsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Update a topic',
    description: 'Updates a topic with new information. You can update the category and tags.',
  })
  @ApiParam({ 
    name: 'id', 
    type: Number, 
    description: 'The ID of the topic to update' 
  })
  @ApiBody({ type: UpdateTopicDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Topic successfully updated.',
    schema: {
      example: {
        id: 1,
        name: 'Present Perfect Tense',
        categoryId: 1,
        complexity: 3,
        language: 'en',
        createdAt: '2026-03-25T10:00:00Z',
        updatedAt: '2026-03-25T10:00:00Z',
        category: { id: 1, name: 'Grammar' },
        tags: []
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Topic, category, or tag not found.' })
  @ApiResponse({ status: 400, description: 'Invalid tag IDs or input data.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTopicDto: UpdateTopicDto,
  ) {
    return this.topicsService.update(id, updateTopicDto);
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Delete a topic',
    description: 'Deletes a topic. The category will not be deleted, and tag associations will be removed.',
  })
  @ApiParam({ 
    name: 'id', 
    type: Number, 
    description: 'The ID of the topic to delete' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Topic successfully deleted.',
    schema: {
      example: {
        id: 1,
        name: 'Present Perfect Tense',
        categoryId: 1,
        complexity: 3,
        language: 'en',
        createdAt: '2026-03-25T10:00:00Z',
        updatedAt: '2026-03-25T10:00:00Z'
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Topic not found.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.topicsService.remove(id);
  }
}

