import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create a new tag',
    description: 'Creates a new tag with a unique name. Tags are used to categorize topics.',
  })
  @ApiBody({ type: CreateTagDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Tag successfully created.',
    schema: {
      example: {
        id: 1,
        name: 'Grammar'
      }
    }
  })
  @ApiResponse({ status: 409, description: 'Tag with this name already exists.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  create(@Body() createTagDto: CreateTagDto) {
    return this.tagsService.create(createTagDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all tags',
    description: 'Retrieves all available tags with their associated topics.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Return all tags.',
    schema: {
      example: [
        {
          id: 1,
          name: 'Grammar',
          topics: []
        }
      ]
    }
  })
  findAll() {
    return this.tagsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get a tag by id',
    description: 'Retrieves a specific tag by its ID along with all associated topics.',
  })
  @ApiParam({ 
    name: 'id', 
    type: Number, 
    description: 'The ID of the tag to retrieve' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Return a tag.',
    schema: {
      example: {
        id: 1,
        name: 'Grammar',
        topics: []
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Tag not found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tagsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Update a tag',
    description: 'Updates a tag with new information. The name must be unique.',
  })
  @ApiParam({ 
    name: 'id', 
    type: Number, 
    description: 'The ID of the tag to update' 
  })
  @ApiBody({ type: UpdateTagDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Tag successfully updated.',
    schema: {
      example: {
        id: 1,
        name: 'Grammar',
        topics: []
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Tag not found.' })
  @ApiResponse({ status: 409, description: 'Tag with this name already exists.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateTagDto: UpdateTagDto) {
    return this.tagsService.update(id, updateTagDto);
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Delete a tag',
    description: 'Deletes a tag. Associated topics will not be deleted.',
  })
  @ApiParam({ 
    name: 'id', 
    type: Number, 
    description: 'The ID of the tag to delete' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Tag successfully deleted.',
    schema: {
      example: {
        id: 1,
        name: 'Grammar'
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Tag not found.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tagsService.remove(id);
  }
}
